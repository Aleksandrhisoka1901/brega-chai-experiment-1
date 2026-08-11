import { Layouts, Page, useRBAC } from "@strapi/admin/strapi-admin";
import {
  Alert,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Modal,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from "@strapi/design-system";
import { ArrowLeft } from "@strapi/icons";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";

import { useOrderAdminApi } from "../api";
import { DataPair, DataSection, StatusBadge } from "../components";
import { OrderEditModal } from "../OrderEditModal";
import type { OrderDetail } from "../types";
import {
  formatOrderDate,
  formatRubles,
  getDeliveryMethodPresentation,
  getStatusActionLabel,
  getStatusConfirmation,
  getStatusPresentation,
  type OrderStatus,
} from "../view-model";

const transitionPermission = [
  { action: "plugin::order-admin.transition", subject: null },
];
const editPermission = [{ action: "plugin::order-admin.edit", subject: null }];

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  color: ${({ theme }) => theme.colors.neutral600};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary600};
  }

  &:focus-visible {
    border-radius: ${({ theme }) => theme.borderRadius};
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 3px;
  }
`;

const ContentGrid = styled(Grid.Root)`
  max-width: 1440px;
  margin-inline: auto;
`;

const NumericText = styled(Typography)`
  font-variant-numeric: tabular-nums;
`;

const ConfirmationModalContent = styled(Modal.Content)`
  max-width: 43rem;
`;

export function OrderDetailPage() {
  const { documentId = "" } = useParams();
  const api = useOrderAdminApi();
  const { allowedActions, isLoading: permissionsLoading } =
    useRBAC(transitionPermission);
  const { allowedActions: editActions, isLoading: editPermissionsLoading } =
    useRBAC(editPermission);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState(false);
  const [confirmation, setConfirmation] = useState<OrderStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const transitionTriggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setOrder(await api.findOne(documentId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [api, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyTransition(status: OrderStatus) {
    setTransitioning(true);
    setTransitionError(false);
    try {
      const updatedOrder = await api.transition(documentId, status);
      setOrder(updatedOrder);
      setAnnouncement(
        `Статус заказа изменён: ${getStatusPresentation(updatedOrder.status).label}`,
      );
      setConfirmation(null);
      transitionTriggerRef.current?.focus();
    } catch {
      setTransitionError(true);
    } finally {
      setTransitioning(false);
    }
  }

  if (loading || permissionsLoading || editPermissionsLoading)
    return <Page.Loading />;
  if (failed) {
    return (
      <Page.Error
        content="Не удалось загрузить заказ"
        action={<Button onClick={load}>Повторить</Button>}
      />
    );
  }
  if (!order) return <Page.NoData content="Заказ не найден" />;
  const delivery = getDeliveryMethodPresentation(order.deliveryMethod);

  return (
    <Page.Main>
      <Page.Title>{`Заказ ${order.orderNumber}`}</Page.Title>
      <Layouts.Header
        navigationAction={
          <BackLink to="/plugins/order-admin">
            <ArrowLeft aria-hidden />
            <Typography fontWeight="semiBold">Все заказы</Typography>
          </BackLink>
        }
        primaryAction={
          (editActions.canEdit && order.editable) ||
          (allowedActions.canTransition &&
            order.availableStatusTransitions.length > 0) ? (
            <Flex gap={2}>
              {editActions.canEdit && order.editable ? (
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  Редактировать заказ
                </Button>
              ) : null}
              {allowedActions.canTransition
                ? order.availableStatusTransitions.map((status) => {
                    const destructive = status === "cancelled";
                    return (
                      <Button
                        key={status}
                        disabled={transitioning}
                        loading={transitioning && confirmation === status}
                        variant={destructive ? "danger-light" : "default"}
                        onClick={(event) => {
                          transitionTriggerRef.current = event.currentTarget;
                          setConfirmation(status);
                        }}
                      >
                        {getStatusActionLabel(status)}
                      </Button>
                    );
                  })
                : null}
            </Flex>
          ) : undefined
        }
        secondaryAction={
          <Flex gap={3}>
            <StatusBadge status={order.status} />
            <NumericText fontWeight="semiBold">
              {formatRubles(order.discountedTotalRubles)}
            </NumericText>
          </Flex>
        }
        subtitle={`Создан ${formatOrderDate(order.createdAt)}`}
        title={`Заказ ${order.orderNumber}`}
      />
      <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
      <Layouts.Content>
        {transitionError && (
          <Box paddingBottom={4}>
            <Alert
              action={
                <Button onClick={() => setTransitionError(false)}>OK</Button>
              }
              closeLabel="Закрыть"
              title="Статус не изменён"
              variant="danger"
            >
              Обновите страницу и повторите действие.
            </Alert>
          </Box>
        )}

        <ContentGrid gap={6}>
          <Grid.Item
            alignItems="stretch"
            col={8}
            data-testid="order-main-column"
            direction="column"
            s={12}
            xs={12}
          >
            <Flex direction="column" gap={6} width="100%">
              <DataSection title="Состав заказа">
                <Box overflow="auto">
                  <Table colCount={5} rowCount={order.lines.length}>
                    <Thead>
                      <Tr>
                        <Th>
                          <Typography variant="sigma">Товар</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Фасовка</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Цена</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Количество</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Сумма</Typography>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {order.lines.map((line) => (
                        <Tr key={`${line.productId}-${line.packageLabel}`}>
                          <Td>
                            <Typography fontWeight="semiBold">
                              {line.title}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography>{line.packageLabel}</Typography>
                          </Td>
                          <Td>
                            <NumericText>
                              {formatRubles(line.unitPriceRubles)}
                            </NumericText>
                          </Td>
                          <Td>
                            <NumericText>{line.quantity}</NumericText>
                          </Td>
                          <Td>
                            <NumericText fontWeight="semiBold">
                              {formatRubles(line.lineTotalRubles)}
                            </NumericText>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
                <Flex
                  alignItems="flex-end"
                  direction="column"
                  gap={2}
                  paddingTop={5}
                >
                  {order.pickupDiscountPercent > 0 ? (
                    <>
                      <NumericText textColor="neutral600">
                        Стандартная сумма: {formatRubles(order.totalRubles)}
                      </NumericText>
                      <Typography textColor="neutral600">
                        Скидка за самовывоз: {order.pickupDiscountPercent}%
                      </Typography>
                    </>
                  ) : null}
                  <NumericText fontWeight="bold" variant="beta">
                    {order.pickupDiscountPercent > 0
                      ? "Сумма со скидкой"
                      : "Итого"}
                    : {formatRubles(order.discountedTotalRubles)}
                  </NumericText>
                </Flex>
              </DataSection>

              <DataSection title="История статусов">
                <Flex direction="column" width="100%">
                  {order.statusHistory.map((entry, index) => (
                    <Fragment key={`${entry.at}-${entry.to}`}>
                      <Flex
                        alignItems="center"
                        justifyContent="space-between"
                        paddingBottom={4}
                        paddingTop={index === 0 ? 0 : 4}
                        width="100%"
                      >
                        <Flex alignItems="center" gap={3}>
                          <StatusBadge status={entry.to} />
                          <Typography fontWeight="semiBold">
                            {entry.from
                              ? `Статус изменён на «${getStatusPresentation(entry.to).label.toLowerCase()}»`
                              : "Заказ создан"}
                          </Typography>
                        </Flex>
                        <Flex alignItems="flex-end" direction="column" gap={1}>
                          <NumericText textColor="neutral600" variant="pi">
                            {formatOrderDate(entry.at)}
                          </NumericText>
                          <Typography textColor="neutral600" variant="pi">
                            {entry.actor?.name ?? "Система"}
                          </Typography>
                        </Flex>
                      </Flex>
                      {index < order.statusHistory.length - 1 && <Divider />}
                    </Fragment>
                  ))}
                </Flex>
              </DataSection>
            </Flex>
          </Grid.Item>

          <Grid.Item
            alignItems="stretch"
            col={4}
            data-testid="order-side-column"
            direction="column"
            s={12}
            xs={12}
          >
            <Flex direction="column" gap={6} width="100%">
              <DataSection title="Детали заказа">
                <Flex
                  alignItems="stretch"
                  direction="column"
                  gap={5}
                  width="100%"
                >
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                  >
                    <StatusBadge status={order.status} />
                    <NumericText fontWeight="bold" variant="beta">
                      {formatRubles(order.discountedTotalRubles)}
                    </NumericText>
                  </Flex>
                  <Divider />
                  <Typography fontWeight="semiBold">Покупатель</Typography>
                  <DataPair label="Имя">{order.customer.name}</DataPair>
                  <DataPair label="Телефон">
                    <Typography
                      href={`tel:${order.customer.phone}`}
                      tag="a"
                      textColor="primary600"
                    >
                      {order.customer.phone}
                    </Typography>
                  </DataPair>
                  <DataPair label="Электронная почта">
                    {order.customer.email ? (
                      <Typography
                        href={`mailto:${order.customer.email}`}
                        tag="a"
                        textColor="primary600"
                      >
                        {order.customer.email}
                      </Typography>
                    ) : null}
                  </DataPair>
                  <Divider />
                  <Typography fontWeight="semiBold">Получение</Typography>
                  <DataPair label="Способ">{delivery.label}</DataPair>
                  <DataPair label={delivery.addressLabel}>
                    {order.deliveryAddress}
                  </DataPair>
                  {order.pickupDiscountPercent > 0 ? (
                    <>
                      <DataPair label="Стандартная сумма">
                        {formatRubles(order.totalRubles)}
                      </DataPair>
                      <DataPair label="Скидка за самовывоз">
                        {order.pickupDiscountPercent}%
                      </DataPair>
                      <DataPair label="Сумма со скидкой">
                        {formatRubles(order.discountedTotalRubles)}
                      </DataPair>
                    </>
                  ) : (
                    <DataPair label="Сумма заказа">
                      {formatRubles(order.totalRubles)}
                    </DataPair>
                  )}
                  <DataPair label="Комментарий покупателя">
                    {order.comment}
                  </DataPair>
                  <DataPair label="Комментарий менеджера">
                    {order.managerComment}
                  </DataPair>
                </Flex>
              </DataSection>
            </Flex>
          </Grid.Item>
        </ContentGrid>
      </Layouts.Content>

      <OrderEditModal
        open={editOpen}
        order={order}
        onClose={() => setEditOpen(false)}
        onSaved={(updatedOrder) => {
          setOrder(updatedOrder);
          setAnnouncement("Изменения заказа сохранены");
        }}
      />

      <Modal.Root
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
            requestAnimationFrame(() => transitionTriggerRef.current?.focus());
          }
        }}
      >
        <ConfirmationModalContent>
          <Modal.Header closeLabel="Закрыть">
            <Modal.Title>
              {confirmation
                ? getStatusConfirmation(confirmation).title
                : "Изменить статус?"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Typography>
              {confirmation
                ? getStatusConfirmation(confirmation).description
                : ""}
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Назад</Button>
            </Modal.Close>
            <Button
              loading={transitioning}
              variant={confirmation === "cancelled" ? "danger" : "default"}
              onClick={() => {
                if (confirmation) void applyTransition(confirmation);
              }}
            >
              {confirmation
                ? getStatusConfirmation(confirmation).confirmLabel
                : "Изменить статус"}
            </Button>
          </Modal.Footer>
        </ConfirmationModalContent>
      </Modal.Root>
    </Page.Main>
  );
}
