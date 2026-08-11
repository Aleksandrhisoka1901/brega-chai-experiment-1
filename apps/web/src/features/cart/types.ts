export const CART_VERSION = 1 as const;

export interface CartImage {
  url: string;
  alt: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  type: "nabor" | "tovar";
  title: string;
  packageLabel: string;
  unitPriceSnapshot: number;
  currency: "RUB";
  image: CartImage;
  quantity: number;
}

export interface Cart {
  version: typeof CART_VERSION;
  items: CartItem[];
}

export interface CartProduct extends Omit<CartItem, "quantity"> {
  stock: number;
}
