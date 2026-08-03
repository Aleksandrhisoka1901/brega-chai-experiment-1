import type { DeliveryMethod, OrderStatus } from "./view-model";

export type OrderListItem = {
  documentId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  status: OrderStatus;
  lineCount: number;
  unitCount: number;
  currency: "RUB";
  totalRubles: number;
  discountedTotalRubles: number;
};

export type OrderListResponse = {
  data: OrderListItem[];
  meta: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
};

export type OrderLine = {
  productId: string;
  slug: string;
  title: string;
  packageLabel: string;
  unitPriceRubles: number;
  quantity: number;
  lineTotalRubles: number;
  currency: "RUB";
};

export type OrderDetail = {
  documentId: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  pickupDiscountPercent: number;
  comment: string | null;
  managerComment: string | null;
  lines: OrderLine[];
  currency: "RUB";
  totalRubles: number;
  discountedTotalRubles: number;
  consents: Record<
    "personalData" | "salesAndDelivery",
    { accepted: boolean; documentVersion: string; acceptedAt?: string }
  >;
  statusHistory: Array<{
    from: OrderStatus | null;
    to: OrderStatus;
    at: string;
    actor?: {
      id: string;
      name: string;
    } | null;
  }>;
  availableStatusTransitions: OrderStatus[];
  editable: boolean;
};

export type OrderProductOption = {
  productId: string;
  technicalName: string;
  displayName: string;
  packageLabel: string;
  priceRubles: number;
  stock: number;
};

export type EditOrderCommand = {
  expectedUpdatedAt: string;
  deliveryAddress: string;
  managerComment: string | null;
  items: Array<{ productId: string; quantity: number }>;
};
