import {
  Alert,
  Box,
  Button,
  Combobox,
  ComboboxOption,
  Divider,
  Field,
  Flex,
  Modal,
  Table,
  Tbody,
  Td,
  Textarea,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { useOrderAdminApi } from "./api";
import type { OrderDetail, OrderProductOption } from "./types";
import {
  calculateEditedOrderTotals,
  formatRubles,
  getEditableLineMaximum,
  getOrderEditErrorMessage,
} from "./view-model";

type EditableLine = {
  productId: string;
  title: string;
  packageLabel: string;
  unitPriceRubles: number;
  quantity: number;
};

const EditModalContent = styled(Modal.Content)`
  width: min(96vw, 90rem);
  max-width: 90rem;
`;

const NumericText = styled(Typography)`
  font-variant-numeric: tabular-nums;
`;

const QuantityField = styled(Field.Root)`
  position: relative;
  width: 9rem;
`;

const QuantityHint = styled(Box)`
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  white-space: nowrap;
`;

const ProductRow = styled(Tr)`
  & > td {
    padding-bottom: ${({ theme }) => theme.spaces[7]};
  }

  && > td:first-of-type {
    padding-top: ${({ theme }) => theme.spaces[4]};
    padding-bottom: ${({ theme }) => theme.spaces[7]};
  }
`;

function toEditableLines(order: OrderDetail): EditableLine[] {
  return order.lines.map((line) => ({
    productId: line.productId,
    title: line.title,
    packageLabel: line.packageLabel,
    unitPriceRubles: line.unitPriceRubles,
    quantity: line.quantity,
  }));
}

export function OrderEditModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: OrderDetail;
  onClose: () => void;
  onSaved: (order: OrderDetail) => void;
}) {
  const api = useOrderAdminApi();
  const [lines, setLines] = useState<EditableLine[]>(() =>
    toEditableLines(order),
  );
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress);
  const [managerComment, setManagerComment] = useState(
    order.managerComment ?? "",
  );
  const [products, setProducts] = useState<OrderProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLines(toEditableLines(order));
    setDeliveryAddress(order.deliveryAddress);
    setManagerComment(order.managerComment ?? "");
    setSelectedProductId("");
    setError("");
    setProductsLoading(true);
    void api
      .products()
      .then(setProducts)
      .catch(() => setError("Не удалось загрузить каталог товаров"))
      .finally(() => setProductsLoading(false));
  }, [api, open, order]);

  const existingProductIds = useMemo(
    () => new Set(lines.map((line) => line.productId)),
    [lines],
  );
  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stock > 0 && !existingProductIds.has(product.productId),
      ),
    [existingProductIds, products],
  );
  const reservedQuantity = useMemo(
    () => new Map(order.lines.map((line) => [line.productId, line.quantity])),
    [order.lines],
  );
  const maximumQuantity = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.productId,
          getEditableLineMaximum(
            product.stock,
            reservedQuantity.get(product.productId) ?? 0,
          ),
        ]),
      ),
    [products, reservedQuantity],
  );
  const totals = calculateEditedOrderTotals(lines, order.pickupDiscountPercent);

  function addProduct() {
    const product = products.find(
      (candidate) => candidate.productId === selectedProductId,
    );
    if (
      !product ||
      product.stock < 1 ||
      existingProductIds.has(product.productId)
    )
      return;
    setLines((current) => [
      ...current,
      {
        productId: product.productId,
        title: product.displayName,
        packageLabel: product.packageLabel,
        unitPriceRubles: product.priceRubles,
        quantity: 1,
      },
    ]);
    setSelectedProductId("");
  }

  function changeQuantity(productId: string, value: string) {
    const quantity = Number(value);
    const maximum = maximumQuantity.get(productId);
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: Number.isInteger(quantity)
                ? Math.max(
                    1,
                    maximum === undefined
                      ? quantity
                      : Math.min(maximum, quantity),
                  )
                : line.quantity,
            }
          : line,
      ),
    );
  }

  async function save() {
    if (!deliveryAddress.trim()) {
      setError("Укажите адрес получения");
      return;
    }
    if (lines.length === 0) {
      setError("В заказе должна остаться хотя бы одна позиция");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await api.edit(order.documentId, {
        expectedUpdatedAt: order.updatedAt,
        deliveryAddress: deliveryAddress.trim(),
        managerComment: managerComment.trim() || null,
        items: lines.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      });
      onSaved(updated);
      onClose();
    } catch (saveError) {
      setError(getOrderEditErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) onClose();
      }}
    >
      <EditModalContent>
        <Modal.Header closeLabel="Закрыть">
          <Modal.Title>Редактировать заказ {order.orderNumber}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex alignItems="stretch" direction="column" gap={6} width="100%">
            {error ? (
              <Alert
                closeLabel="Закрыть"
                title="Изменения не сохранены"
                variant="danger"
              >
                {error}
              </Alert>
            ) : null}

            <Box>
              <Typography tag="h3" variant="delta">
                Состав заказа
              </Typography>
              <Typography textColor="neutral600" variant="pi">
                Цены существующих позиций сохраняются. Новые товары добавляются
                по текущей цене.
              </Typography>
            </Box>

            <Box overflow="auto">
              <Table colCount={6} rowCount={lines.length}>
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
                    <Th>
                      <Typography variant="sigma">Действие</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {lines.map((line) => (
                    <ProductRow key={line.productId}>
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
                        <QuantityField
                          hint={`Доступно: ${maximumQuantity.get(line.productId) ?? "—"}`}
                          name={`quantity-${line.productId}`}
                        >
                          <Field.Input
                            aria-label={`Количество: ${line.title}`}
                            max={maximumQuantity.get(line.productId)}
                            min={1}
                            type="number"
                            value={line.quantity}
                            onChange={(event) =>
                              changeQuantity(line.productId, event.target.value)
                            }
                          />
                          <QuantityHint>
                            <Field.Hint />
                          </QuantityHint>
                        </QuantityField>
                      </Td>
                      <Td>
                        <NumericText fontWeight="semiBold">
                          {formatRubles(line.unitPriceRubles * line.quantity)}
                        </NumericText>
                      </Td>
                      <Td>
                        <Button
                          disabled={lines.length === 1}
                          size="S"
                          variant="danger-light"
                          onClick={() =>
                            setLines((current) =>
                              current.filter(
                                (candidate) =>
                                  candidate.productId !== line.productId,
                              ),
                            )
                          }
                        >
                          Удалить
                        </Button>
                      </Td>
                    </ProductRow>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Flex alignItems="flex-end" gap={3} wrap="wrap">
              <Box minWidth="30rem">
                <Field.Root name="new-product">
                  <Field.Label>Добавить товар</Field.Label>
                  <Combobox
                    autocomplete={{ filter: "contains", type: "list" }}
                    aria-label="Добавить товар"
                    clearLabel="Очистить выбранный товар"
                    disabled={productsLoading}
                    loading={productsLoading}
                    noOptionsMessage={() => "Товары не найдены"}
                    placeholder={
                      productsLoading
                        ? "Загружаем каталог…"
                        : "Найдите товар по названию"
                    }
                    value={selectedProductId || undefined}
                    onChange={(value) => setSelectedProductId(String(value))}
                    onClear={() => setSelectedProductId("")}
                  >
                    {availableProducts.map((product) => (
                      <ComboboxOption
                        key={product.productId}
                        textValue={`${product.technicalName} ${product.displayName}`}
                        value={product.productId}
                      >
                        {product.technicalName} · {product.packageLabel} ·{" "}
                        {formatRubles(product.priceRubles)} · остаток{" "}
                        {product.stock}
                      </ComboboxOption>
                    ))}
                  </Combobox>
                </Field.Root>
              </Box>
              <Button
                disabled={!selectedProductId}
                variant="secondary"
                onClick={addProduct}
              >
                Добавить позицию
              </Button>
            </Flex>

            <Divider />

            <Flex alignItems="stretch" direction="column" gap={4} width="100%">
              <Field.Root name="deliveryAddress" required>
                <Field.Label>Адрес получения</Field.Label>
                <Textarea
                  maxLength={500}
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                />
              </Field.Root>
              <Field.Root
                hint="Внутренняя заметка, покупатель её не увидит."
                name="managerComment"
              >
                <Field.Label>Комментарий менеджера</Field.Label>
                <Textarea
                  maxLength={2000}
                  placeholder="Дополнительный телефон, пожелания клиента или договорённости"
                  value={managerComment}
                  onChange={(event) => setManagerComment(event.target.value)}
                />
                <Field.Hint />
              </Field.Root>
            </Flex>

            <Flex alignItems="flex-end" direction="column" gap={2}>
              <NumericText textColor="neutral600">
                Стандартная сумма: {formatRubles(totals.totalRubles)}
              </NumericText>
              {order.pickupDiscountPercent > 0 ? (
                <Typography textColor="neutral600">
                  Скидка за самовывоз: {order.pickupDiscountPercent}%
                </Typography>
              ) : null}
              <NumericText fontWeight="bold" variant="beta">
                Итого: {formatRubles(totals.discountedTotalRubles)}
              </NumericText>
            </Flex>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Button disabled={saving} variant="tertiary" onClick={onClose}>
            Отмена
          </Button>
          <Button loading={saving} onClick={() => void save()}>
            Сохранить изменения
          </Button>
        </Modal.Footer>
      </EditModalContent>
    </Modal.Root>
  );
}
