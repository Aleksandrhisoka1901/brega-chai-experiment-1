import { Layouts, Page, useRBAC } from "@strapi/admin/strapi-admin";
import {
  Alert,
  Box,
  Button,
  Flex,
  Grid,
  Modal,
  Typography,
  VisuallyHidden,
} from "@strapi/design-system";
import { ArrowLeft } from "@strapi/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";

import { useOrderAdminApi } from "../api";
import {
  ConfirmationModalContent,
  DataPair,
  DataSection,
  InquiryStatusBadge,
} from "../components";
import type { InquiryDetail } from "../types";
import {
  formatOrderDate,
  getInquiryStatusActionLabel,
  getInquiryStatusConfirmation,
  getInquiryStatusPresentation,
  getInquiryTransitionErrorMessage,
  type InquiryStatus,
} from "../view-model";

const transitionPermission = [
  { action: "plugin::order-admin.transition", subject: null },
];

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
  max-width: 960px;
  margin-inline: auto;
`;

export function InquiryDetailPage() {
  const { documentId = "" } = useParams();
  const api = useOrderAdminApi();
  const { allowedActions, isLoading: permissionsLoading } =
    useRBAC(transitionPermission);
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<InquiryStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const transitionTriggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setInquiry(await api.findInquiry(documentId));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [api, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyTransition(status: InquiryStatus) {
    setTransitioning(true);
    setTransitionError(null);
    try {
      const updated = await api.transitionInquiry(documentId, status);
      setInquiry(updated);
      setAnnouncement(
        `Статус заявки изменён: ${getInquiryStatusPresentation(updated.status).label}`,
      );
      setConfirmation(null);
      transitionTriggerRef.current?.focus();
    } catch (error) {
      setTransitionError(getInquiryTransitionErrorMessage(error));
    } finally {
      setTransitioning(false);
    }
  }

  if (loading || permissionsLoading) return <Page.Loading />;
  if (failed) {
    return (
      <Page.Error
        content="Не удалось загрузить заявку"
        action={<Button onClick={load}>Повторить</Button>}
      />
    );
  }
  if (!inquiry) return <Page.NoData content="Заявка не найдена" />;

  return (
    <Page.Main>
      <Page.Title>{`Заявка ${inquiry.customerName}`}</Page.Title>
      <Layouts.Header
        navigationAction={
          <BackLink to="/plugins/order-admin/inquiries">
            <ArrowLeft aria-hidden />
            <Typography fontWeight="semiBold">Все заявки</Typography>
          </BackLink>
        }
        primaryAction={
          allowedActions.canTransition &&
          inquiry.availableStatusTransitions.length > 0 ? (
            <Flex gap={2}>
              {inquiry.availableStatusTransitions.map((status) => (
                <Button
                  key={status}
                  disabled={transitioning}
                  loading={transitioning && confirmation === status}
                  variant="default"
                  onClick={(event) => {
                    transitionTriggerRef.current = event.currentTarget;
                    setConfirmation(status);
                  }}
                >
                  {getInquiryStatusActionLabel(status)}
                </Button>
              ))}
            </Flex>
          ) : undefined
        }
        secondaryAction={<InquiryStatusBadge status={inquiry.status} />}
        subtitle={`Создана ${formatOrderDate(inquiry.createdAt)}`}
        title={inquiry.customerName}
      />
      <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
      <Layouts.Content>
        {transitionError && (
          <Box paddingBottom={4}>
            <Alert
              action={
                <Button onClick={() => setTransitionError(null)}>OK</Button>
              }
              closeLabel="Закрыть"
              title="Статус не изменён"
              variant="danger"
            >
              {transitionError}
            </Alert>
          </Box>
        )}

        <ContentGrid gap={6}>
          <Grid.Item
            alignItems="stretch"
            col={12}
            direction="column"
            s={12}
            xs={12}
          >
            <DataSection title="Контакты и запрос">
              <Flex alignItems="stretch" direction="column" gap={5} width="100%">
                <DataPair label="Имя">{inquiry.customerName}</DataPair>
                <DataPair label="Телефон">
                  <Typography
                    href={`tel:${inquiry.customerPhone}`}
                    tag="a"
                    textColor="primary600"
                  >
                    {inquiry.customerPhone}
                  </Typography>
                </DataPair>
                <DataPair label="Электронная почта">
                  <Typography
                    href={`mailto:${inquiry.customerEmail}`}
                    tag="a"
                    textColor="primary600"
                  >
                    {inquiry.customerEmail}
                  </Typography>
                </DataPair>
                <DataPair label="Интересующая система">
                  {inquiry.modelInterest}
                </DataPair>
                <DataPair label="Страница заявки">{inquiry.source}</DataPair>
                <DataPair label="Комментарий">{inquiry.comment}</DataPair>
              </Flex>
            </DataSection>
          </Grid.Item>
        </ContentGrid>
      </Layouts.Content>

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
                ? getInquiryStatusConfirmation(confirmation).title
                : "Изменить статус?"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Typography>
              {confirmation
                ? getInquiryStatusConfirmation(confirmation).description
                : ""}
            </Typography>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Назад</Button>
            </Modal.Close>
            <Button
              loading={transitioning}
              variant="default"
              onClick={() => {
                if (confirmation) void applyTransition(confirmation);
              }}
            >
              {confirmation
                ? getInquiryStatusConfirmation(confirmation).confirmLabel
                : "Изменить статус"}
            </Button>
          </Modal.Footer>
        </ConfirmationModalContent>
      </Modal.Root>
    </Page.Main>
  );
}
