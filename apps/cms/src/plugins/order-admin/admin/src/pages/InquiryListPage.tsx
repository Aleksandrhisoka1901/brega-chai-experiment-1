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
import { ConfirmationModalContent, InquiryStatusBadge } from "../components";
import type { InquiryListItem, InquiryListResponse } from "../types";
import { buildListSearch, formatOrderDate } from "../view-model";

const PAGE_SIZE = 25;
const deletePermission = [
  { action: "plugin::order-admin.delete", subject: null },
];

function toBoundary(value: string, end = false) {
  if (!value) return undefined;
  return `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

export function InquiryListPage() {
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
  const [result, setResult] = useState<InquiryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<InquiryListItem | null>(null);
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
      setResult(await api.listInquiries(requestSearch));
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

  async function deleteInquiry() {
    if (!deleteConfirmation || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    try {
      await api.deleteInquiry(deleteConfirmation.documentId);
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
        content="Не удалось загрузить заявки"
        action={<Button onClick={load}>Повторить</Button>}
      />
    );
  }

  return (
    <Page.Main>
      <Page.Title>Заявки</Page.Title>
      <Layouts.Header
        subtitle="Заявки с витрины: контакты, интересующая система и статус обработки"
        title="Заявки"
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
              <Field.Label>Имя, телефон или система</Field.Label>
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
                <SingleSelectOption value="new">Новая</SingleSelectOption>
                <SingleSelectOption value="processed">
                  Обработана
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
          <Page.Loading>Загружаем заявки</Page.Loading>
        ) : result && result.data.length > 0 ? (
          <>
            <Table colCount={7} rowCount={result.data.length}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Имя</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Создана</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Телефон</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Почта</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Система</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Статус</Typography>
                  </Th>
                  <Th>
                    <VisuallyHidden>Действия</VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {result.data.map((inquiry) => (
                  <Tr key={inquiry.documentId}>
                    <Td>
                      <Typography
                        fontWeight="semiBold"
                        tag={Link}
                        textColor="primary600"
                        to={inquiry.documentId}
                      >
                        {inquiry.customerName}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>
                        {formatOrderDate(inquiry.createdAt)}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography>{inquiry.customerPhone}</Typography>
                    </Td>
                    <Td>
                      <Typography>{inquiry.customerEmail}</Typography>
                    </Td>
                    <Td>
                      <Typography>{inquiry.modelInterest || "—"}</Typography>
                    </Td>
                    <Td>
                      <InquiryStatusBadge status={inquiry.status} />
                    </Td>
                    <Td>
                      {!permissionsLoading && allowedActions.canDelete ? (
                        <IconButton
                          label={`Удалить заявку ${inquiry.customerName}`}
                          variant="ghost"
                          onClick={() => {
                            setDeleteError(false);
                            setDeleteConfirmation(inquiry);
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
                  {result.meta.total} заявок
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
          <Page.NoData content="Заявки по заданным условиям не найдены" />
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
            <Modal.Title>Удалить заявку?</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex alignItems="stretch" direction="column" gap={4}>
              <Typography>
                {deleteConfirmation
                  ? `Заявка ${deleteConfirmation.customerName} будет удалена без возможности восстановления.`
                  : ""}
              </Typography>
              {deleteError ? (
                <Alert
                  closeLabel="Закрыть"
                  title="Заявка не удалена"
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
              onClick={() => void deleteInquiry()}
            >
              Удалить заявку
            </Button>
          </Modal.Footer>
        </ConfirmationModalContent>
      </Modal.Root>
    </Page.Main>
  );
}
