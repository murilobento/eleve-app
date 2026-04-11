import type { ManagedServiceOrder } from "@/lib/service-orders-admin";
import { getServiceOrderStatusBadgeClass } from "@/lib/status-badge";

export type ServiceAgendaEntry = {
  id: string;
  itemId: string;
  serviceOrderId: string;
  serviceOrderNumber: string;
  clientName: string;
  equipmentName: string;
  equipmentTypeName: string;
  operatorName: string;
  serviceTypeName: string;
  serviceDescription: string;
  serviceDate: string;
  plannedStartTime: string;
  plannedEndTime: string;
  status: ManagedServiceOrder["status"];
  address: string;
  location: string;
  notes: string | null;
};

export function getServiceAgendaStatusBadgeClass(status: ManagedServiceOrder["status"]) {
  return getServiceOrderStatusBadgeClass(status);
}

export function formatAgendaDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildServiceAddress(serviceOrder: ManagedServiceOrder) {
  return [
    serviceOrder.serviceStreet,
    serviceOrder.serviceNumber,
    serviceOrder.serviceComplement,
    serviceOrder.serviceDistrict,
    `${serviceOrder.serviceCity} - ${serviceOrder.serviceState}`,
  ].filter(Boolean).join(", ");
}

export function listServiceAgendaEntries(serviceOrders: ManagedServiceOrder[]) {
  return serviceOrders
    .filter((serviceOrder) => serviceOrder.status !== "pending")
    .flatMap((serviceOrder) =>
      serviceOrder.items.map((item, itemIndex) => ({
        id: `${serviceOrder.id}:${item.id}:${itemIndex}`,
        itemId: item.id,
        serviceOrderId: serviceOrder.id,
        serviceOrderNumber: serviceOrder.number,
        clientName: serviceOrder.clientName,
        equipmentName: item.equipmentName,
        equipmentTypeName: item.equipmentTypeName,
        operatorName: item.operatorName,
        serviceTypeName: item.serviceTypeName,
        serviceDescription: item.serviceDescription,
        serviceDate: item.serviceDate,
        plannedStartTime: item.plannedStartTime,
        plannedEndTime: item.plannedEndTime,
        status: serviceOrder.status,
        address: buildServiceAddress(serviceOrder),
        location: `${serviceOrder.serviceCity} - ${serviceOrder.serviceState}`,
        notes: serviceOrder.notes || item.notes || null,
      })),
    )
    .sort((left, right) => {
      if (left.serviceDate !== right.serviceDate) {
        return left.serviceDate.localeCompare(right.serviceDate);
      }

      if (left.plannedStartTime !== right.plannedStartTime) {
        return left.plannedStartTime.localeCompare(right.plannedStartTime);
      }

      if (left.plannedEndTime !== right.plannedEndTime) {
        return left.plannedEndTime.localeCompare(right.plannedEndTime);
      }

      if (left.serviceOrderNumber !== right.serviceOrderNumber) {
        return left.serviceOrderNumber.localeCompare(right.serviceOrderNumber);
      }

      return left.itemId.localeCompare(right.itemId);
    });
}

export function listServiceAgendaEntriesForDate(serviceOrders: ManagedServiceOrder[], dateKey: string) {
  return listServiceAgendaEntries(serviceOrders).filter((entry) => entry.serviceDate === dateKey);
}
