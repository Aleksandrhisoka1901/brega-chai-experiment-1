import { Badge, Box, Flex, Modal, Typography } from "@strapi/design-system";
import styled from "styled-components";

import type { OrderStatus } from "./view-model";
import { getStatusPresentation } from "./view-model";

const DataValue = styled(Box)`
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
`;

export const ConfirmationModalContent = styled(Modal.Content)`
  max-width: 43rem;
`;

export function StatusBadge({ status }: { status: OrderStatus }) {
  const presentation = getStatusPresentation(status);
  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}

export function DataSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      background="neutral0"
      borderColor="neutral150"
      hasRadius
      padding={6}
      shadow="filterShadow"
      width="100%"
    >
      <Typography tag="h2" variant="delta">
        {title}
      </Typography>
      <Box paddingTop={5}>{children}</Box>
    </Box>
  );
}

export function DataPair({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const value =
    typeof children === "string" || typeof children === "number" ? (
      <Typography>{children}</Typography>
    ) : (
      children || <Typography>—</Typography>
    );

  return (
    <Flex alignItems="flex-start" direction="column" gap={1} width="100%">
      <Typography textColor="neutral600" variant="pi">
        {label}
      </Typography>
      <DataValue>{value}</DataValue>
    </Flex>
  );
}
