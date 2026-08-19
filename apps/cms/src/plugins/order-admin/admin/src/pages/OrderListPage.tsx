import { Layouts, Page, useRBAC } from "@strapi/admin/strapi-admin";
import {
  Alert,
  Box,
  Button,
  Field,
  Flex,
  IconButton,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from "@strapi/design-system";
import { Search, Trash } from "@strapi/icons";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useOrderAdminApi } from "../api";
import { ConfirmationModalContent, StatusBadge } from "../components";
import type { OrderListItem, OrderListResponse } from "../types";
import {
  buildListSearch,
  formatOrderDate,
  formatRubles,
  type OrderStatus,
} from "../view-model";

const PAGE_SIZE = 25;
const deletePermission = [
  { action: "plugin::order-admin.delete", subject: null },
];

function toBoundary(value: string, end = false) {
  if (!value) return undefined;
  return `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

export function OrderListPage() {
  const api = useOrderAdminApi();
  const { allowedActions, isLoading: permissionsLoading } =
    useRBAC(deletePermission);
  const [urlSearch, setUrlSearch] = useSearchParams();
  const page = Math.max(1, Number(urlSearch.get("page")) || 1);
  const [search, setSearch] = useState(urlSearch.get("search") ?? "");
  const [status, setStatus] = useState(urlSearch.get("status") ?? "");
  const [createdFrom, setCreatedFrom] = useState(
    urlSearch.get("createdFrom") ?? "",
  );
  const [createdTo, setCreatedTo] = useState(urlSearch.get("createdTo") ?? "");
  const [result, setResult] = useState<OrderListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<OrderListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const requestSearch = useMemo(
    () =>
      buildListSearch({
        page,
        pageSize: PAGE_SIZE,
        search: urlSearch.get("search") ?? undefined,
        status: urlSearch.get("status") ?? undefined,
        createdFrom: toBoundary(urlSearch.get("createdFrom") ?? ""),
        createdTo: toBoundary(urlSearch.get("createdTo") ?? "", true),
      }),
    [page, urlSearch],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await api.list(requestSearch));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [api, requestSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (search.trim()) next.set("search", search.trim());
    if (status) next.set("status", status);
    if (createdFrom) next.set("createdFrom", createdFrom);
    if (createdTo) next.set("createdTo", createdTo);
    setUrlSearch(next);
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(urlSearch);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setUrlSearch(next);
  }

  async function deleteOrder() {
    if (!deleteConfirmation || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api.delete(deleteConfirmation.documentId);
      setDeleteConfirmation(null);
      if (result?.data.length === 1 && page > 1) changePage(page - 1);
      else await load();
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }

  if (failed) {
    return (
      <Page.Error
        content="Не удалось загрузить заказы"
        action={<Button onClick={load}>Повторить</Button>}
      />
    );
  }

  return (
    <Page.Main>
      <Page.Title>Заказы</Page.Title>
      <Layouts.Header
        subtitle="Поиск, проверка состава и обработка статусов"
        title="Заказы"
      />
      <Layouts.Content>
        <Box
          background="neutral0"
          borderColor="neutral150"
          hasRadius
          marginBottom={6}
          padding={5}
          shadow="filterShadow"
        >
          <Flex
            alignItems="flex-end"
            gap={4}
            tag="form"
            wrap="wrap"
            onSubmit={applyFilters}
          >
            <Field.Root name="search">
              <Field.Label>Номер или покупатель</Field.Label>
              <Field.Input
                endAction={<Search aria-hidden />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field.Root>
            <Field.Root name="status">
              <Field.Label>Статус</Field.Label>
              <SingleSelect
                aria-label="Статус"
                clearLabel="Сбросить статус"
                placeholder="Все статусы"
                value={status || null}
                onChange={(value) => setStatus(String(value))}
                onClear={() => setStatus("")}
              >
                <SingleSelectOption value="new">Новый</SingleSelectOption>
                <SingleSelectOption value="confirmed">
                  Подтверждён
                </SingleSelectOption>
                <SingleSelectOption value="completed">
                  Выполнен
                </SingleSelectOption>
                <SingleSelectOption value="cancelled">
                  Отменён
                </SingleSelectOption>
              </SingleSelect>
            </Field.Root>
            <Field.Root name="createdFrom">
              <Field.Label>С даты</Field.Label>
              <Field.Input
                type="date"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
              />
            </Field.Root>
            <Field.Root name="createdTo">
              <Field.Label>По дату</Field.Label>
              <Field.Input
                type="date"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
              />
            </Field.Root>
            <Button type="submit">Применить</Button>
          </Flex>
        </Box>

        {loading ? (
          <Page.Loading>Загружаем заказы</Page.Loading>
        ) : result && result.data.length > 0 ? (
          <>
            <Table colCount={8} rowCount={result.data.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Заказ</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Создан</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Покупатель</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Статус</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Позиций</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Единиц</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Сумма</Typography>
                  </Th>
                  <Th>
                    <VisuallyHidden>Действия</VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {result.data.map((order) => (
                  <Tr key={order.documentId}>
                    <Td>
                      <Typography
                        fontWeight="semiBold"
                        tag={Link}
                        textColor="primary600"
                        to={order.documentId}
                      >
                        {order.orderNumber}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {formatOrderDate(order.createdAt)}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{order.customerName}</Typography>
                    </Td>
                    <Td>
                      <StatusBadge status={order.status as OrderStatus} />
                    </Td>
                    <Td>
                      <Typography>{order.lineCount}</Typography>
                    </Td>
                    <Td>
                      <Typography>{order.unitCount}</Typography>
                    </Td>
                    <Td>
                      <Typography fontWeight="semiBold">
                        {formatRubles(order.discountedTotalRubles)}
                      </Typography>
                    </Td>
                    <Td>
                      {!permissionsLoading && allowedActions.canDelete ? (
                        <IconButton
                          label={`Удалить заказ ${order.orderNumber}`}
                          variant="ghost"
                          onClick={() => {
                            setDeleteError(false);
                            setDeleteConfirmation(order);
                          }}
                        >
                          <Trash />
                        </IconButton>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            {result.meta.pageCount > 1 && (
              <Flex justifyContent="space-between" paddingTop={4}>
                <Typography textColor="neutral600">
                  {result.meta.total} заказов
                </Typography>
                <Flex gap={2}>
                  <Button
                    disabled={page <= 1}
                    variant="tertiary"
                    onClick={() => changePage(page - 1)}
                  >
                    Назад
                  </Button>
                  <Typography>
                    {page} из {result.meta.pageCount}
                  </Typography>
                  <Button
                    disabled={page >= result.meta.pageCount}
                    variant="tertiary"
                    onClick={() => changePage(page + 1)}
                  >
                    Далее
                  </Button>
                </Flex>
              </Flex>
            )}
          </>
        ) : (
          <Page.NoData content="Заказы по заданным условиям не найдены" />
        )}
      </Layouts.Content>
      <Modal.Root
        open={deleteConfirmation !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteConfirmation(null);
            setDeleteError(false);
          }
        }}
      >
        <ConfirmationModalContent>
          <Modal.Header closeLabel="Закрыть">
            <Modal.Title>Удалить заказ?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex alignItems="stretch" direction="column" gap={4}>
              <Typography>
                {deleteConfirmation
                  ? `Заказ ${deleteConfirmation.orderNumber} будет удалён без возможности восстановления.`
                  : ""}
              </Typography>
              {deleteError ? (
                <Alert
                  closeLabel="Закрыть"
                  title="Заказ не удалён"
                  variant="danger"
                >
                  Обновите список и повторите действие.
                </Alert>
              ) : null}
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button disabled={deleting} variant="tertiary">
                Отмена
              </Button>
            </Modal.Close>
            <Button
              loading={deleting}
              variant="danger"
              onClick={() => void deleteOrder()}
            >
              Удалить заказ
            </Button>
          </Modal.Footer>
        </ConfirmationModalContent>
      </Modal.Root>
    </Page.Main>
  );
}
