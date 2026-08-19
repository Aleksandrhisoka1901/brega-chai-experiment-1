"use strict";

const { ZodError } = require("zod");

const {
  parseEditCommand,
  parseDocumentId,
  parseListQuery,
  parseProductQuery,
  parseStatusCommand,
} = require("./domain");

function createOrderAdminController({ strapi }) {
  const service = () => strapi.plugin("order-admin").service("orders");
  const actorFromUser = (user) => {
    if (!user?.id) return null;
    const name = [user.firstname, user.lastname].filter(Boolean).join(" ");
    return {
      id: String(user.id),
      name: name || user.username || `Администратор ${user.id}`,
    };
  };

  return {
    async list(ctx) {
      try {
        ctx.body = await service().list(parseListQuery(ctx.query));
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректный запрос");
        throw error;
      }
    },

    async findOne(ctx) {
      let documentId;
      try {
        documentId = parseDocumentId(ctx.params.documentId);
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректный идентификатор заказа");
        throw error;
      }

      const order = await service().findOne(documentId);
      if (!order) return ctx.notFound("Заказ не найден");
      ctx.body = { data: order };
    },

    async products(ctx) {
      try {
        ctx.body = await service().products(parseProductQuery(ctx.query));
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректный запрос товаров");
        throw error;
      }
    },

    async edit(ctx) {
      let command;
      let documentId;
      try {
        command = parseEditCommand(ctx.request.body);
        documentId = parseDocumentId(ctx.params.documentId);
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректные данные заказа");
        throw error;
      }

      const actor = actorFromUser(ctx.state?.user);
      try {
        const order = await service().edit(documentId, command, actor);
        if (!order) return ctx.notFound("Заказ не найден");
        strapi.log?.info("Order admin edit", {
          documentId,
          administratorId: actor?.id ?? null,
          result: "success",
        });
        ctx.body = { data: order };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;
        if (code === "ORDER_NOT_FOUND") {
          return ctx.notFound("Заказ не найден");
        }
        if (code === "INVALID_INPUT") {
          return ctx.badRequest("Некорректные данные заказа");
        }
        if (
          code === "ORDER_NOT_EDITABLE" ||
          code === "ORDER_VERSION_CONFLICT" ||
          code === "PRODUCT_NOT_FOUND" ||
          code === "PRODUCT_UNAVAILABLE" ||
          code === "INSUFFICIENT_STOCK" ||
          code === "STOCK_RESTORE_FAILED"
        ) {
          strapi.log?.warn?.("Order admin edit", {
            documentId,
            administratorId: actor?.id ?? null,
            result: "rejected",
            errorCode: code,
          });
          const message = {
            ORDER_NOT_EDITABLE: "Этот заказ уже нельзя редактировать",
            ORDER_VERSION_CONFLICT:
              "Заказ уже изменён другим менеджером. Обновите страницу",
            PRODUCT_NOT_FOUND: "Один из товаров не найден",
            PRODUCT_UNAVAILABLE: "Один из товаров больше недоступен",
            INSUFFICIENT_STOCK: "Недостаточно товара на складе",
            STOCK_RESTORE_FAILED: "Не удалось обновить товарные остатки",
          }[code];
          return ctx.conflict(message);
        }
        throw error;
      }
    },

    async transition(ctx) {
      let command;
      let documentId;
      try {
        command = parseStatusCommand(ctx.request.body);
        documentId = parseDocumentId(ctx.params.documentId);
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректный статус");
        throw error;
      }

      const currentOrder = await service().findOne(documentId);
      if (!currentOrder) return ctx.notFound("Заказ не найден");

      try {
        const actor = actorFromUser(ctx.state?.user);
        const order = await service().transition(
          documentId,
          command.status,
          actor,
        );
        if (!order) return ctx.notFound("Заказ не найден");
        strapi.log?.info("Order admin status transition", {
          documentId,
          from: currentOrder.status,
          to: command.status,
          administratorId: actor?.id ?? null,
          result: "success",
        });
        ctx.body = { data: order };
      } catch (error) {
        const errorCode =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;
        if (
          errorCode === "INVALID_STATUS_TRANSITION" ||
          errorCode === "ORDER_NOT_FOUND" ||
          errorCode === "PRODUCT_NOT_FOUND"
        ) {
          strapi.log?.warn?.("Order admin status transition", {
            documentId,
            from: currentOrder.status,
            to: command.status,
            administratorId: actorFromUser(ctx.state?.user)?.id ?? null,
            result: "rejected",
            errorCode,
          });
          if (errorCode === "ORDER_NOT_FOUND") {
            return ctx.notFound("Заказ не найден");
          }
          if (errorCode === "PRODUCT_NOT_FOUND") {
            const missingProductId = error.details?.productId;
            const missingLine = currentOrder.lines?.find(
              (line) => line.productId === missingProductId,
            );
            return ctx.conflict(
              missingLine?.title
                ? `Нельзя подтвердить заказ: товар «${missingLine.title}» удалён`
                : "Нельзя подтвердить заказ: один из товаров удалён",
            );
          }
          return ctx.conflict("Статус заказа уже изменился");
        }
        throw error;
      }
    },

    async delete(ctx) {
      let documentId;
      try {
        documentId = parseDocumentId(ctx.params.documentId);
      } catch (error) {
        if (error instanceof ZodError)
          return ctx.badRequest("Некорректный идентификатор заказа");
        throw error;
      }

      const actor = actorFromUser(ctx.state?.user);
      try {
        const result = await service().delete(documentId);
        strapi.log?.info("Order admin delete", {
          documentId,
          administratorId: actor?.id ?? null,
          result: "success",
        });
        ctx.body = { data: result };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? error.code
            : null;
        if (code === "ORDER_NOT_FOUND") {
          return ctx.notFound("Заказ не найден");
        }
        strapi.log?.warn?.("Order admin delete", {
          documentId,
          administratorId: actor?.id ?? null,
          result: "rejected",
          errorCode: code,
        });
        throw error;
      }
    },
  };
}

module.exports = { createOrderAdminController };
