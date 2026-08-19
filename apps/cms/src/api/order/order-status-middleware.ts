const ORDER_UID = "api::order.order";

interface DocumentUpdateContext {
  uid?: string;
  action?: string;
  params?: {
    documentId?: string;
    data?: Record<string, unknown>;
  };
}

interface OrderStatusMiddlewareDependencies {
  deleteOrder(orderId: string): Promise<unknown>;
  findStatus(orderId: string): Promise<unknown>;
  transitionStatus(orderId: string, nextStatus: unknown): Promise<unknown>;
}

export function createOrderStatusMiddleware({
  deleteOrder,
  findStatus,
  transitionStatus,
}: OrderStatusMiddlewareDependencies) {
  return async (
    context: DocumentUpdateContext,
    next: () => Promise<unknown>,
  ) => {
    if (context.uid === ORDER_UID && context.action === "delete") {
      const orderId = context.params?.documentId;
      if (!orderId) {
        throw new Error("Order deletion requires a document id");
      }

      return deleteOrder(orderId);
    }

    const data = context.params?.data;
    if (
      context.uid !== ORDER_UID ||
      context.action !== "update" ||
      !data ||
      !Object.prototype.hasOwnProperty.call(data, "orderStatus")
    ) {
      return next();
    }

    const orderId = context.params?.documentId;
    if (!orderId) {
      throw new Error("Order status update requires a document id");
    }

    const { orderStatus: nextStatus, ...directUpdateData } = data;
    const currentStatus = await findStatus(orderId);

    if (currentStatus !== nextStatus) {
      await transitionStatus(orderId, nextStatus);
    }

    context.params.data = directUpdateData;
    return next();
  };
}

export function registerOrderStatusMiddleware(strapi: any) {
  strapi.documents.use(
    createOrderStatusMiddleware({
      async deleteOrder(orderId) {
        await strapi.service(ORDER_UID).deleteFromAdmin(orderId);
      },
      async findStatus(orderId) {
        const order = await strapi.db.query(ORDER_UID).findOne({
          where: { documentId: orderId },
          select: ["orderStatus"],
        });
        return order?.orderStatus;
      },
      async transitionStatus(orderId, nextStatus) {
        await strapi.service(ORDER_UID).transitionStatus(orderId, nextStatus);
      },
    }),
  );
}
