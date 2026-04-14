import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { auth, pool } from "@/lib/auth";
import {
  calculateBudgetSubtotal,
  calculateBudgetTotal,
  type BudgetServiceItemInput,
  type BudgetStatus,
  type BudgetTransitionStatus,
  type ManagedBudget,
  type ManagedBudgetItem,
  type ManagedBudgetStatusHistory,
} from "@/lib/budgets-admin";
import type {
  FuelFinancialStatus,
  FuelMeterKind,
  FuelType,
  ManagedFuelRecord,
} from "@/lib/fuel-admin";
import type { ManagedFuelRequisition, UpdateFuelRequisitionStatusInput } from "@/lib/fuel-requisitions-admin";
import {
  PERMISSION_CATALOG,
  type PermissionKey,
  type RoleRecord,
  type UserRoleSummary,
} from "@/lib/rbac-shared";
import type { EquipmentOption } from "@/lib/equipment-admin";
import type {
  MaintenanceFinancialStatus,
  MaintenanceMeterKind,
  MaintenanceStatus,
  MaintenanceType,
  ManagedMaintenanceRecord,
} from "@/lib/maintenance-admin";
import type {
  ManagedMaintenanceRequisition,
  RequisitionStatus,
  UpdateMaintenanceRequisitionStatusInput,
} from "@/lib/maintenance-requisitions-admin";
import type {
  ManagedPartsRequisition,
  UpdatePartsRequisitionStatusInput,
} from "@/lib/parts-requisitions-admin";
import type {
  ManagedServiceOrder,
  ManagedServiceOrderItem,
  ManagedServiceOrderStatusHistory,
  ServiceOrderStatus,
  ServiceOrderItemInput,
  ServiceOrderTransitionStatus,
} from "@/lib/service-orders-admin";
import { isDateBeforeToday } from "@/lib/service-date";
import type { ManagedServiceType } from "@/lib/service-types-admin";
import type {
  ManagedSupplier,
  SupplierOption,
  SupplierStatus,
  SupplierType,
} from "@/lib/suppliers-admin";
import { logRequestSecurityEvent } from "@/lib/security-events";

export type RoleWithDetails = RoleRecord & {
  permissions: PermissionKey[];
  permissionsCount: number;
  usersCount: number;
};

type SessionUser = {
  id: string;
  role?: string | null;
};

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

type StatusActorInput = {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
};

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
};

type PermissionRow = {
  key: PermissionKey;
};

type EquipmentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type EquipmentRow = {
  id: string;
  type_id: string;
  type_name: string;
  status: "active" | "inactive";
  license_required: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate: string | null;
  lifting_capacity_tons: number | null;
  created_at: string;
  updated_at: string;
};

type MaintenanceRecordRow = {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  financial_status: MaintenanceFinancialStatus;
  planned_date: string;
  performed_date: string | null;
  description: string;
  supplier_name: string | null;
  document_number: string | null;
  notes: string | null;
  amount_total: string | number | null;
  payment_due_date: string | null;
  paid_at: string | null;
  meter_kind: MaintenanceMeterKind | null;
  meter_value: string | number | null;
  created_at: string;
  updated_at: string;
};

type FuelRecordRow = {
  id: string;
  equipment_id: string | null;
  equipment_name: string | null;
  equipment_brand: string | null;
  equipment_model: string | null;
  fuel_date: string;
  financial_status: FuelFinancialStatus;
  fuel_type: FuelType | null;
  total_amount: string | number;
  liters: string | number | null;
  meter_kind: FuelMeterKind | null;
  meter_reading: string | number | null;
  supplier_name: string | null;
  document_number: string | null;
  notes: string | null;
  payment_due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupplierRow = {
  id: string;
  supplier_type: SupplierType | null;
  supplier_types: SupplierType[] | null;
  status: SupplierStatus;
  legal_name: string;
  trade_name: string | null;
  document: string;
  contact_name: string | null;
  contact_phone: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
  updated_at: string;
};

type MaintenanceRequisitionRow = {
  id: string;
  number: string;
  revision_number: string | number;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  supplier_id: string;
  supplier_name: string;
  supplier_types: SupplierType[] | null;
  requester_user_id: string | null;
  requester_name_snapshot: string | null;
  requester_email_snapshot: string | null;
  status: RequisitionStatus;
  scheduled_date: string;
  description: string;
  notes: string | null;
  completion_notes: string | null;
  issued_at: string | null;
  last_issued_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type FuelRequisitionRow = {
  id: string;
  number: string;
  revision_number: string | number;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  supplier_id: string;
  supplier_name: string;
  supplier_types: SupplierType[] | null;
  requester_user_id: string | null;
  requester_name_snapshot: string | null;
  requester_email_snapshot: string | null;
  status: RequisitionStatus;
  scheduled_date: string;
  fuel_type: FuelType | null;
  notes: string | null;
  completion_notes: string | null;
  issued_at: string | null;
  last_issued_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type PartsRequisitionRow = {
  id: string;
  number: string;
  revision_number: string | number;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  supplier_id: string;
  supplier_name: string;
  supplier_types: SupplierType[] | null;
  requester_user_id: string | null;
  requester_name_snapshot: string | null;
  requester_email_snapshot: string | null;
  status: RequisitionStatus;
  scheduled_date: string;
  description: string;
  notes: string | null;
  completion_notes: string | null;
  issued_at: string | null;
  last_issued_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceTypeRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  billing_unit:
    | "hour"
    | "daily"
    | "monthly"
    | "annual"
    | "km"
    | "freight"
    | "mobilization_demobilization"
    | "counterweight_transport";
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
  created_at: string;
  updated_at: string;
  equipment_ids?: string[] | null;
  equipment_json?: string | null;
  equipment_count?: string | number;
};

type CompanyRow = {
  id: string;
  app_name: string | null;
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  email: string;
  phone: string;
  website: string | null;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  person_type: "PF" | "PJ";
  status: "active" | "inactive";
  legal_name: string;
  trade_name: string | null;
  document: string;
  contact_name: string | null;
  contact_phone: string | null;
  email: string | null;
  phone: string;
  website: string | null;
  postal_code: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  created_at: string;
  updated_at: string;
};

type OperatorRow = {
  id: string;
  name: string;
  phone: string;
  license: "A" | "B" | "C" | "D" | "E";
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type BudgetRow = {
  id: string;
  number: string;
  status: "pending" | "approved" | "cancelled";
  client_id: string;
  client_name: string;
  service_postal_code: string;
  service_street: string;
  service_number: string;
  service_complement: string | null;
  service_district: string;
  service_city: string;
  service_state: string;
  service_country: string;
  subtotal_value: string | number;
  manual_adjustment: string | number;
  total_value: string | number;
  item_count: string | number;
  items_json: string;
  notes: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type BudgetItemRow = {
  id: string;
  position: number;
  service_type_id: string;
  service_type_name: string;
  service_type_billing_unit: string;
  equipment_id: string;
  equipment_name: string;
  equipment_brand: string;
  equipment_model: string;
  operator_id: string;
  operator_name: string;
  service_description: string;
  service_date: string;
  start_time: string;
  end_time: string;
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
  initial_value: string | number;
  created_at: string;
  updated_at: string;
};

type ServiceOrderRow = {
  id: string;
  number: string;
  origin_type: "manual" | "budget";
  source_budget_id: string | null;
  source_budget_number: string | null;
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  client_id: string;
  client_name: string;
  service_postal_code: string;
  service_street: string;
  service_number: string;
  service_complement: string | null;
  service_district: string;
  service_city: string;
  service_state: string;
  service_country: string;
  item_count: string | number;
  items_json: string;
  notes: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceOrderItemRow = {
  id: string;
  position: number;
  source_budget_item_id: string | null;
  service_type_id: string;
  service_type_name: string;
  service_type_billing_unit: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type_name: string;
  equipment_brand: string;
  equipment_model: string;
  operator_id: string;
  operator_name: string;
  service_description: string;
  service_date: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  quoted_value: string | number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BudgetStatusHistoryRow = {
  id: string;
  budget_id: string | null;
  budget_number: string;
  previous_status: BudgetStatus | null;
  next_status: BudgetStatus;
  reason: string | null;
  actor_user_id: string | null;
  actor_name_snapshot: string | null;
  actor_email_snapshot: string | null;
  created_at: string;
};

type ServiceOrderStatusHistoryRow = {
  id: string;
  service_order_id: string | null;
  service_order_number: string;
  previous_status: ServiceOrderStatus | null;
  next_status: ServiceOrderStatus;
  reason: string | null;
  actor_user_id: string | null;
  actor_name_snapshot: string | null;
  actor_email_snapshot: string | null;
  created_at: string;
};

type BudgetServiceTypeSnapshotRow = {
  id: string;
  billing_unit: ServiceTypeRow["billing_unit"];
  base_value: string | number;
  minimum_hours: string | number | null;
  minimum_km: string | number | null;
};

type UserAccessRow = {
  user_id: string;
  is_active: boolean;
  reason: string | null;
};

type UserAccessState = {
  isActive: boolean;
  reason: string | null;
};

const SYSTEM_ROLE_SLUGS = {
  admin: "admin",
  user: "user",
} as const;

let rbacBaseBootstrapPromise: Promise<void> | null = null;
let rbacBaseBootstrapped = false;

function normalizeLegacyRole(role?: string | null) {
  return role
    ?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean) ?? [];
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_access_status (
      user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      is_active boolean NOT NULL DEFAULT true,
      reason text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id text PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      is_system boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id text PRIMARY KEY,
      resource text NOT NULL,
      action text NOT NULL,
      key text NOT NULL UNIQUE,
      description text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, role_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment_types (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS equipment_types_name_lower_idx
    ON equipment_types ((lower(name)));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipment (
      id text PRIMARY KEY,
      type_id text NOT NULL REFERENCES equipment_types(id) ON DELETE RESTRICT,
      status text NOT NULL DEFAULT 'active',
      license_required text NOT NULL,
      name text NOT NULL,
      model text NOT NULL,
      brand text NOT NULL,
      year integer NOT NULL,
      plate text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company (
      id text PRIMARY KEY,
      singleton_key boolean NOT NULL DEFAULT true UNIQUE,
      app_name text,
      legal_name text NOT NULL,
      trade_name text,
      cnpj text NOT NULL,
      email text NOT NULL,
      phone text NOT NULL,
      website text,
      postal_code text NOT NULL,
      street text NOT NULL,
      number text NOT NULL,
      complement text,
      district text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      country text NOT NULL DEFAULT 'Brasil',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id text PRIMARY KEY,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      maintenance_type text NOT NULL,
      status text NOT NULL DEFAULT 'planned',
      financial_status text NOT NULL DEFAULT 'pending',
      planned_date date NOT NULL,
      performed_date date,
      description text NOT NULL,
      supplier_name text,
      document_number text,
      notes text,
      amount_total numeric(12, 2),
      payment_due_date date,
      paid_at date,
      meter_kind text,
      meter_value numeric(12, 2),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS maintenance_records_equipment_id_idx
    ON maintenance_records (equipment_id, planned_date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS maintenance_records_status_idx
    ON maintenance_records (status, financial_status);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuel_records (
      id text PRIMARY KEY,
      equipment_id text REFERENCES equipment(id) ON DELETE SET NULL,
      fuel_date date NOT NULL,
      financial_status text NOT NULL DEFAULT 'pending',
      fuel_type text,
      total_amount numeric(12, 2) NOT NULL,
      liters numeric(12, 3),
      meter_kind text,
      meter_reading numeric(12, 2),
      supplier_name text,
      document_number text,
      notes text,
      payment_due_date date,
      paid_at date,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS fuel_records_equipment_id_idx
    ON fuel_records (equipment_id, fuel_date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS fuel_records_financial_status_idx
    ON fuel_records (financial_status, fuel_date DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id text PRIMARY KEY,
      supplier_type text NOT NULL,
      supplier_types text[],
      status text NOT NULL DEFAULT 'active',
      legal_name text NOT NULL,
      trade_name text,
      document text NOT NULL,
      contact_name text,
      contact_phone text,
      email text,
      phone text NOT NULL,
      website text,
      postal_code text NOT NULL,
      street text NOT NULL,
      number text NOT NULL,
      complement text,
      district text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      country text NOT NULL DEFAULT 'Brasil',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS suppliers_legal_name_document_idx
    ON suppliers ((lower(legal_name)), document);
  `);

  await pool.query(`
    ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS supplier_types text[];
  `);

  await pool.query(`
    UPDATE suppliers
    SET supplier_types = CASE supplier_type
      WHEN 'fuel_station' THEN ARRAY['fuel_station']
      WHEN 'workshop' THEN ARRAY['mechanical']
      WHEN 'other' THEN ARRAY['parts']
      WHEN 'mechanical' THEN ARRAY['mechanical']
      WHEN 'electrical' THEN ARRAY['electrical']
      WHEN 'parts' THEN ARRAY['parts']
      ELSE ARRAY['parts']
    END::text[]
    WHERE supplier_types IS NULL OR cardinality(supplier_types) = 0;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_requisitions (
      id text PRIMARY KEY,
      number text NOT NULL UNIQUE,
      revision_number integer NOT NULL DEFAULT 1,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      supplier_id text NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      requester_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      requester_name_snapshot text,
      requester_email_snapshot text,
      status text NOT NULL DEFAULT 'draft',
      scheduled_date date NOT NULL,
      description text NOT NULL,
      notes text,
      completion_notes text,
      issued_at timestamptz,
      last_issued_at timestamptz,
      completed_at date,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS maintenance_requisitions_status_idx
    ON maintenance_requisitions (status, scheduled_date DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fuel_requisitions (
      id text PRIMARY KEY,
      number text NOT NULL UNIQUE,
      revision_number integer NOT NULL DEFAULT 1,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      supplier_id text NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      requester_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      requester_name_snapshot text,
      requester_email_snapshot text,
      status text NOT NULL DEFAULT 'draft',
      scheduled_date date NOT NULL,
      notes text,
      completion_notes text,
      issued_at timestamptz,
      last_issued_at timestamptz,
      completed_at date,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS fuel_requisitions_status_idx
    ON fuel_requisitions (status, scheduled_date DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS parts_requisitions (
      id text PRIMARY KEY,
      number text NOT NULL UNIQUE,
      revision_number integer NOT NULL DEFAULT 1,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      supplier_id text NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      requester_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      requester_name_snapshot text,
      requester_email_snapshot text,
      status text NOT NULL DEFAULT 'draft',
      scheduled_date date NOT NULL,
      description text NOT NULL,
      notes text,
      completion_notes text,
      issued_at timestamptz,
      last_issued_at timestamptz,
      completed_at date,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS parts_requisitions_status_idx
    ON parts_requisitions (status, scheduled_date DESC);
  `);

  await pool.query(`
    ALTER TABLE fuel_requisitions
    ALTER COLUMN notes DROP NOT NULL;
  `);

  await pool.query(`
    ALTER TABLE fuel_requisitions
    ADD COLUMN IF NOT EXISTS fuel_type text;
  `);

  await pool.query(`
    ALTER TABLE company
    ADD COLUMN IF NOT EXISTS app_name text;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS company_cnpj_idx
    ON company (cnpj);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id text PRIMARY KEY,
      person_type text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      legal_name text NOT NULL,
      trade_name text,
      document text NOT NULL,
      contact_name text,
      contact_phone text,
      email text,
      phone text NOT NULL,
      website text,
      postal_code text NOT NULL,
      street text NOT NULL,
      number text NOT NULL,
      complement text,
      district text NOT NULL,
      city text NOT NULL,
      state text NOT NULL,
      country text NOT NULL DEFAULT 'Brasil',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    ALTER TABLE equipment
    ADD COLUMN IF NOT EXISTS lifting_capacity_tons double precision;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_types (
      id text PRIMARY KEY,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'active',
      billing_unit text NOT NULL,
      base_value numeric(12, 2) NOT NULL,
      minimum_hours numeric(12, 2),
      minimum_km numeric(12, 2),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS service_types_name_lower_idx
    ON service_types ((lower(name)));
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_type_equipment (
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (service_type_id, equipment_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_type_equipment_equipment_idx
    ON service_type_equipment (equipment_id);
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS clients_document_idx
    ON clients (document);
  `);

  await pool.query(`
    ALTER TABLE clients
    ALTER COLUMN email DROP NOT NULL;
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS contact_name text;
  `);

  await pool.query(`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS contact_phone text;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS operators (
      id text PRIMARY KEY,
      name text NOT NULL,
      phone text NOT NULL,
      license text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE operators
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id text PRIMARY KEY,
      number text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      client_id text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
      operator_id text NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
      service_description text NOT NULL,
      service_date date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      service_postal_code text NOT NULL,
      service_street text NOT NULL,
      service_number text NOT NULL,
      service_complement text,
      service_district text NOT NULL,
      service_city text NOT NULL,
      service_state text NOT NULL,
      service_country text NOT NULL DEFAULT 'Brasil',
      initial_value numeric(12, 2) NOT NULL,
      notes text,
      approved_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS manual_adjustment numeric(12, 2) NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS subtotal_value numeric(12, 2);
  `);

  await pool.query(`
    ALTER TABLE budgets
    ADD COLUMN IF NOT EXISTS total_value numeric(12, 2);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_items (
      id text PRIMARY KEY,
      budget_id text NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
      position integer NOT NULL DEFAULT 0,
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      operator_id text NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
      service_description text NOT NULL,
      service_date date NOT NULL,
      start_time time NOT NULL,
      end_time time NOT NULL,
      billing_unit text NOT NULL,
      base_value numeric(12, 2) NOT NULL,
      minimum_hours numeric(12, 2),
      minimum_km numeric(12, 2),
      initial_value numeric(12, 2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS budget_items_budget_position_idx
    ON budget_items (budget_id, position);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_budget_id_idx
    ON budget_items (budget_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_service_type_id_idx
    ON budget_items (service_type_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_equipment_id_idx
    ON budget_items (equipment_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_items_operator_id_idx
    ON budget_items (operator_id);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS budgets_number_idx
    ON budgets (number);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_status_idx
    ON budgets (status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_client_id_idx
    ON budgets (client_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_equipment_id_idx
    ON budgets (equipment_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_service_type_id_idx
    ON budgets (service_type_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budgets_operator_id_idx
    ON budgets (operator_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_status_history (
      id text PRIMARY KEY,
      budget_id text REFERENCES budgets(id) ON DELETE SET NULL,
      budget_number text NOT NULL,
      previous_status text,
      next_status text NOT NULL,
      reason text,
      actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      actor_name_snapshot text,
      actor_email_snapshot text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS budget_status_history_budget_id_idx
    ON budget_status_history (budget_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id text PRIMARY KEY,
      number text NOT NULL,
      origin_type text NOT NULL DEFAULT 'manual',
      source_budget_id text REFERENCES budgets(id) ON DELETE SET NULL,
      source_budget_number text,
      status text NOT NULL DEFAULT 'pending',
      client_id text NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      client_name text NOT NULL,
      service_postal_code text NOT NULL,
      service_street text NOT NULL,
      service_number text NOT NULL,
      service_complement text,
      service_district text NOT NULL,
      service_city text NOT NULL,
      service_state text NOT NULL,
      service_country text NOT NULL DEFAULT 'Brasil',
      notes text,
      completed_at timestamptz,
      cancelled_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    UPDATE service_orders
    SET status = 'pending'
    WHERE status = 'draft';
  `);

  await pool.query(`
    ALTER TABLE service_orders
    ALTER COLUMN status SET DEFAULT 'pending';
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS service_orders_number_idx
    ON service_orders (number);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_orders_status_idx
    ON service_orders (status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_orders_client_id_idx
    ON service_orders (client_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_orders_source_budget_id_idx
    ON service_orders (source_budget_id);
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS service_orders_source_budget_unique_idx
    ON service_orders (source_budget_id)
    WHERE source_budget_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_order_items (
      id text PRIMARY KEY,
      service_order_id text NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
      position integer NOT NULL DEFAULT 0,
      source_budget_item_id text REFERENCES budget_items(id) ON DELETE SET NULL,
      service_type_id text NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
      equipment_id text NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
      operator_id text NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
      service_description text NOT NULL,
      service_date date NOT NULL,
      planned_start_time time NOT NULL,
      planned_end_time time NOT NULL,
      actual_start_time time,
      actual_end_time time,
      quoted_value numeric(12, 2),
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS service_order_items_order_position_idx
    ON service_order_items (service_order_id, position);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_order_items_order_id_idx
    ON service_order_items (service_order_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_order_status_history (
      id text PRIMARY KEY,
      service_order_id text REFERENCES service_orders(id) ON DELETE SET NULL,
      service_order_number text NOT NULL,
      previous_status text,
      next_status text NOT NULL,
      reason text,
      actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      actor_name_snapshot text,
      actor_email_snapshot text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS service_order_status_history_order_id_idx
    ON service_order_status_history (service_order_id, created_at DESC);
  `);

  const legacyBudgetItems = await pool.query<{
    budget_id: string;
    service_type_id: string;
    equipment_id: string;
    operator_id: string;
    service_description: string;
    service_date: string;
    start_time: string;
    end_time: string;
    initial_value: string | number;
    created_at: string;
    updated_at: string;
    billing_unit: ServiceTypeRow["billing_unit"];
    base_value: string | number;
    minimum_hours: string | number | null;
    minimum_km: string | number | null;
  }>(
    `
      SELECT
        b.id AS budget_id,
        b.service_type_id,
        b.equipment_id,
        b.operator_id,
        b.service_description,
        b.service_date::text,
        b.start_time::text,
        b.end_time::text,
        b.initial_value::text,
        b.created_at,
        b.updated_at,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text
      FROM budgets b
      INNER JOIN service_types st ON st.id = b.service_type_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      WHERE bi.id IS NULL
    `,
  );

  if (legacyBudgetItems.rows.length > 0) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const row of legacyBudgetItems.rows) {
        await client.query(
          `
            INSERT INTO budget_items (
              id,
              budget_id,
              position,
              service_type_id,
              equipment_id,
              operator_id,
              service_description,
              service_date,
              start_time,
              end_time,
              billing_unit,
              base_value,
              minimum_hours,
              minimum_km,
              initial_value,
              created_at,
              updated_at
            )
            VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `,
          [
            randomUUID(),
            row.budget_id,
            row.service_type_id,
            row.equipment_id,
            row.operator_id,
            row.service_description,
            row.service_date,
            row.start_time,
            row.end_time,
            row.billing_unit,
            row.base_value,
            row.minimum_hours,
            row.minimum_km,
            row.initial_value,
            row.created_at,
            row.updated_at,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.query(`
    UPDATE budget_items
    SET initial_value = ROUND((base_value * minimum_hours)::numeric, 2),
        updated_at = now()
    WHERE billing_unit = 'hour'
      AND minimum_hours IS NOT NULL
      AND minimum_hours > 1
      AND initial_value = base_value;
  `);

  await pool.query(`
    UPDATE budgets b
    SET initial_value = bi.initial_value,
        updated_at = now()
    FROM budget_items bi
    WHERE bi.budget_id = b.id
      AND bi.position = 0
      AND b.initial_value IS DISTINCT FROM bi.initial_value;
  `);

  await pool.query(`
    UPDATE budgets b
    SET subtotal_value = COALESCE(items.subtotal_value, b.initial_value),
        total_value = COALESCE(items.subtotal_value, b.initial_value) + COALESCE(b.manual_adjustment, 0)
    FROM (
      SELECT budget_id, SUM(initial_value)::numeric(12, 2) AS subtotal_value
      FROM budget_items
      GROUP BY budget_id
    ) items
    WHERE b.id = items.budget_id
      AND (
        b.subtotal_value IS DISTINCT FROM items.subtotal_value
        OR b.total_value IS DISTINCT FROM (items.subtotal_value + COALESCE(b.manual_adjustment, 0))
      );
  `);

  await pool.query(`
    UPDATE budgets
    SET subtotal_value = COALESCE(subtotal_value, initial_value),
        total_value = COALESCE(total_value, COALESCE(subtotal_value, initial_value) + COALESCE(manual_adjustment, 0))
    WHERE subtotal_value IS NULL OR total_value IS NULL;
  `);
}

function normalizeUserAccessState(row?: Partial<UserAccessRow> | null): UserAccessState {
  return {
    isActive: row?.is_active ?? true,
    reason: row?.reason ?? null,
  };
}

function normalizeRoleName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function slugifyRoleName(name: string) {
  const base = normalizeRoleName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "role";
}

async function findConflictingRoleByName(name: string, excludeRoleId?: string) {
  const params = excludeRoleId ? [name, excludeRoleId] : [name];
  const query = excludeRoleId
    ? `SELECT id FROM roles WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`
    : `SELECT id FROM roles WHERE lower(name) = lower($1) LIMIT 1`;
  const result = await pool.query<{ id: string }>(query, params);
  return result.rows[0]?.id ?? null;
}

async function generateUniqueRoleSlug(name: string, excludeRoleId?: string) {
  const baseSlug = slugifyRoleName(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const params = excludeRoleId ? [candidate, excludeRoleId] : [candidate];
    const query = excludeRoleId
      ? `SELECT id FROM roles WHERE slug = $1 AND id <> $2 LIMIT 1`
      : `SELECT id FROM roles WHERE slug = $1 LIMIT 1`;
    const result = await pool.query<{ id: string }>(query, params);

    if (!result.rows[0]) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function seedPermissions() {
  for (const permission of PERMISSION_CATALOG) {
    await pool.query(
      `
        INSERT INTO permissions (id, resource, action, key, description)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE
        SET resource = EXCLUDED.resource,
            action = EXCLUDED.action,
            description = EXCLUDED.description
      `,
      [randomUUID(), permission.resource, permission.action, permission.key, permission.description],
    );
  }
}

async function ensureRole({
  name,
  slug,
  description,
  isSystem,
}: {
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
}) {
  const existing = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = $1 LIMIT 1`,
    [slug],
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    await pool.query(
      `
        UPDATE roles
        SET name = $2,
            description = $3,
            is_system = $4,
            updated_at = now()
        WHERE id = $1
      `,
      [row.id, name, description, isSystem],
    );
    return row.id;
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO roles (id, name, slug, description, is_system)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, name, slug, description, isSystem],
  );
  return id;
}

async function getPermissionIds(keys: readonly PermissionKey[]) {
  const rows = await pool.query<{ id: string; key: PermissionKey }>(
    `SELECT id, key FROM permissions WHERE key = ANY($1::text[])`,
    [keys],
  );

  const idsByKey = new Map(rows.rows.map((row) => [row.key, row.id]));
  return keys.map((key) => {
    const id = idsByKey.get(key);

    if (!id) {
      throw new Error(`Missing permission seed for ${key}`);
    }

    return id;
  });
}

async function syncRolePermissions(roleId: string, permissionKeys: readonly PermissionKey[]) {
  const permissionIds = await getPermissionIds(permissionKeys);

  await pool.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

  for (const permissionId of permissionIds) {
    await pool.query(
      `
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [roleId, permissionId],
    );
  }
}

async function seedSystemRoles() {
  const adminRoleId = await ensureRole({
    name: "Admin",
    slug: SYSTEM_ROLE_SLUGS.admin,
    description: "Full system access.",
    isSystem: true,
  });

  const userRoleId = await ensureRole({
    name: "User",
    slug: SYSTEM_ROLE_SLUGS.user,
    description: "Default signed-in access.",
    isSystem: false,
  });

  await syncRolePermissions(adminRoleId, PERMISSION_CATALOG.map((permission) => permission.key));
  await syncRolePermissions(userRoleId, ["dashboard.read", "calendar.read"]);
}

async function assignRoleToUser(userId: string, roleSlug: string) {
  const role = await getRoleBySlug(roleSlug);

  if (!role) {
    throw new Error(`Role ${roleSlug} was not found.`);
  }

  await pool.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [userId, role.id],
  );
}

async function listDirectUserRoleSlugs(userId: string) {
  const result = await pool.query<{ slug: string }>(
    `
      SELECT r.slug
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `,
    [userId],
  );

  return result.rows.map((row) => row.slug);
}

async function ensureBootstrapUser(user?: SessionUser | null) {
  if (!user) {
    return;
  }

  const totalUsersResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "user"`);
  const totalUsers = Number(totalUsersResult.rows[0]?.count ?? "0");

  if (totalUsers !== 1) {
    return;
  }

  const firstUserResult = await pool.query<{ id: string }>(
    `SELECT id FROM "user" ORDER BY "createdAt" ASC LIMIT 1`,
  );

  if (firstUserResult.rows[0]?.id !== user.id) {
    return;
  }

  await assignRoleToUser(user.id, SYSTEM_ROLE_SLUGS.admin);
  await ensureLegacyRoleSync(user.id);
}

async function ensureLegacyRoleSync(userId: string) {
  const roleSlugs = await getUserRoleSlugs(userId);
  const nextRole = roleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) ? "admin" : "user";
  await pool.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [nextRole, userId]);
}

export async function bootstrapRbac(user?: SessionUser | null) {
  if (!rbacBaseBootstrapped) {
    if (!rbacBaseBootstrapPromise) {
      rbacBaseBootstrapPromise = (async () => {
        await ensureSchema();
        await seedPermissions();
        await seedSystemRoles();
        rbacBaseBootstrapped = true;
      })().catch((error) => {
        rbacBaseBootstrapPromise = null;
        rbacBaseBootstrapped = false;
        throw error;
      });
    }

    await rbacBaseBootstrapPromise;
  }

  await ensureBootstrapUser(user);
}

export async function getRoleBySlug(slug: string) {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = $1 LIMIT 1`,
    [slug],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return mapRoleRow(row);
}

function mapRoleRow(row: RoleRow): RoleRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isSystem: row.is_system,
  };
}

function mapEquipmentTypeRow(
  row: EquipmentTypeRow & { equipment_count?: string | number },
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    equipmentCount: Number(row.equipment_count ?? 0),
  };
}

function mapEquipmentRow(row: EquipmentRow) {
  return {
    id: row.id,
    typeId: row.type_id,
    typeName: row.type_name,
    status: row.status,
    licenseRequired: row.license_required,
    name: row.name,
    model: row.model,
    brand: row.brand,
    year: row.year,
    plate: row.plate,
    liftingCapacityTons: row.lifting_capacity_tons,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatDateOnly(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

function mapMaintenanceRecordRow(row: MaintenanceRecordRow): ManagedMaintenanceRecord {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    maintenanceType: row.maintenance_type,
    status: row.status,
    financialStatus: row.financial_status,
    plannedDate: row.planned_date.slice(0, 10),
    performedDate: formatDateOnly(row.performed_date),
    description: row.description,
    supplierName: row.supplier_name,
    documentNumber: row.document_number,
    notes: row.notes,
    amountTotal: row.amount_total === null ? null : Number(row.amount_total),
    paymentDueDate: formatDateOnly(row.payment_due_date),
    paidAt: formatDateOnly(row.paid_at),
    meterKind: row.meter_kind,
    meterValue: row.meter_value === null ? null : Number(row.meter_value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculateFuelAverage(
  current: Pick<FuelRecordRow, "equipment_id" | "fuel_date" | "liters" | "meter_kind" | "meter_reading">,
  previous: Pick<FuelRecordRow, "meter_kind" | "meter_reading"> | null,
) {
  if (
    !current.equipment_id
    || current.liters == null
    || current.meter_kind == null
    || current.meter_reading == null
    || !previous
    || previous.meter_kind !== current.meter_kind
    || previous.meter_reading == null
  ) {
    return {
      averageLabel: null,
      averageValue: null,
    };
  }

  const currentMeter = Number(current.meter_reading);
  const previousMeter = Number(previous.meter_reading);
  const liters = Number(current.liters);

  if (current.meter_kind === "km") {
    const distance = currentMeter - previousMeter;

    if (distance <= 0 || liters <= 0) {
      return { averageLabel: null, averageValue: null };
    }

    return {
      averageLabel: "km/l",
      averageValue: Math.round(((distance / liters) + Number.EPSILON) * 100) / 100,
    };
  }

  const elapsed = currentMeter - previousMeter;

  if (elapsed <= 0 || liters <= 0) {
    return { averageLabel: null, averageValue: null };
  }

  return {
    averageLabel: "l/h",
    averageValue: Math.round(((liters / elapsed) + Number.EPSILON) * 100) / 100,
  };
}

function mapFuelRecordRow(
  row: FuelRecordRow,
  previous: Pick<FuelRecordRow, "meter_kind" | "meter_reading"> | null,
): ManagedFuelRecord {
  const average = calculateFuelAverage(row, previous);

  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    fuelDate: row.fuel_date.slice(0, 10),
    financialStatus: row.financial_status,
    fuelType: row.fuel_type,
    totalAmount: Number(row.total_amount),
    liters: row.liters === null ? null : Number(row.liters),
    meterKind: row.meter_kind,
    meterReading: row.meter_reading === null ? null : Number(row.meter_reading),
    averageLabel: average.averageLabel,
    averageValue: average.averageValue,
    supplierName: row.supplier_name,
    documentNumber: row.document_number,
    notes: row.notes,
    paymentDueDate: formatDateOnly(row.payment_due_date),
    paidAt: formatDateOnly(row.paid_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupplierRow(row: SupplierRow): ManagedSupplier {
  const supplierTypes = row.supplier_types ?? (row.supplier_type ? [row.supplier_type] : []);

  return {
    id: row.id,
    supplierTypes,
    status: row.status,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    document: row.document,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    email: row.email,
    phone: row.phone,
    website: row.website,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupplierOptionRow(
  row: Pick<SupplierRow, "id" | "legal_name" | "trade_name" | "supplier_type" | "supplier_types" | "status">,
): SupplierOption {
  const supplierTypes = row.supplier_types ?? (row.supplier_type ? [row.supplier_type] : []);

  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    supplierTypes,
    status: row.status,
  };
}

function mapMaintenanceRequisitionRow(row: MaintenanceRequisitionRow): ManagedMaintenanceRequisition {
  const supplierTypes = row.supplier_types ?? [];

  return {
    id: row.id,
    number: row.number,
    revisionNumber: Number(row.revision_number),
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierTypes,
    requesterUserId: row.requester_user_id,
    requesterNameSnapshot: row.requester_name_snapshot,
    requesterEmailSnapshot: row.requester_email_snapshot,
    status: row.status,
    scheduledDate: row.scheduled_date.slice(0, 10),
    description: row.description,
    notes: row.notes,
    completionNotes: row.completion_notes,
    issuedAt: row.issued_at,
    lastIssuedAt: row.last_issued_at,
    completedAt: formatDateOnly(row.completed_at),
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFuelRequisitionRow(row: FuelRequisitionRow): ManagedFuelRequisition {
  const supplierTypes = row.supplier_types ?? [];

  return {
    id: row.id,
    number: row.number,
    revisionNumber: Number(row.revision_number),
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierTypes,
    requesterUserId: row.requester_user_id,
    requesterNameSnapshot: row.requester_name_snapshot,
    requesterEmailSnapshot: row.requester_email_snapshot,
    status: row.status,
    scheduledDate: row.scheduled_date.slice(0, 10),
    fuelType: row.fuel_type,
    notes: row.notes,
    completionNotes: row.completion_notes,
    issuedAt: row.issued_at,
    lastIssuedAt: row.last_issued_at,
    completedAt: formatDateOnly(row.completed_at),
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPartsRequisitionRow(row: PartsRequisitionRow): ManagedPartsRequisition {
  const supplierTypes = row.supplier_types ?? [];

  return {
    id: row.id,
    number: row.number,
    revisionNumber: Number(row.revision_number),
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierTypes,
    requesterUserId: row.requester_user_id,
    requesterNameSnapshot: row.requester_name_snapshot,
    requesterEmailSnapshot: row.requester_email_snapshot,
    status: row.status,
    scheduledDate: row.scheduled_date.slice(0, 10),
    description: row.description,
    notes: row.notes,
    completionNotes: row.completion_notes,
    issuedAt: row.issued_at,
    lastIssuedAt: row.last_issued_at,
    completedAt: formatDateOnly(row.completed_at),
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceTypeRow(row: ServiceTypeRow): ManagedServiceType {
  const equipment = row.equipment_json ? JSON.parse(row.equipment_json) as ManagedServiceType["equipment"] : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    billingUnit: row.billing_unit,
    baseValue: Number(row.base_value),
    minimumHours: row.minimum_hours == null ? null : Number(row.minimum_hours),
    minimumKm: row.minimum_km == null ? null : Number(row.minimum_km),
    equipmentIds: row.equipment_ids ?? equipment.map((item) => item.id),
    equipment,
    equipmentCount: Number(row.equipment_count ?? equipment.length),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompanyRow(row: CompanyRow) {
  return {
    id: row.id,
    appName: row.app_name,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    cnpj: row.cnpj,
  email: row.email,
    phone: row.phone,
    website: row.website,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClientRow(row: ClientRow) {
  return {
    id: row.id,
    personType: row.person_type,
    status: row.status,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    document: row.document,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    email: row.email,
    phone: row.phone,
    website: row.website,
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOperatorRow(row: OperatorRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    license: row.license,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetItemRow(row: BudgetItemRow): ManagedBudgetItem {
  return {
    id: row.id,
    position: Number(row.position),
    serviceTypeId: row.service_type_id,
    serviceTypeName: row.service_type_name,
    serviceTypeBillingUnit: row.service_type_billing_unit,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    serviceDescription: row.service_description,
    serviceDate: row.service_date.slice(0, 10),
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    baseValue: Number(row.base_value),
    minimumHours: row.minimum_hours === null ? null : Number(row.minimum_hours),
    minimumKm: row.minimum_km === null ? null : Number(row.minimum_km),
    initialValue: Number(row.initial_value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetRow(row: BudgetRow): ManagedBudget {
  const items = JSON.parse(row.items_json || "[]") as BudgetItemRow[];

  return {
    id: row.id,
    number: row.number,
    status: row.status,
    clientId: row.client_id,
    clientName: row.client_name,
    servicePostalCode: row.service_postal_code,
    serviceStreet: row.service_street,
    serviceNumber: row.service_number,
    serviceComplement: row.service_complement,
    serviceDistrict: row.service_district,
    serviceCity: row.service_city,
    serviceState: row.service_state,
    serviceCountry: row.service_country,
    subtotalValue: Number(row.subtotal_value),
    manualAdjustment: Number(row.manual_adjustment),
    totalValue: Number(row.total_value),
    itemCount: Number(row.item_count),
    items: items.map(mapBudgetItemRow),
    notes: row.notes,
    approvedAt: row.approved_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceOrderItemRow(row: ServiceOrderItemRow): ManagedServiceOrderItem {
  return {
    id: row.id,
    position: Number(row.position),
    sourceBudgetItemId: row.source_budget_item_id,
    serviceTypeId: row.service_type_id,
    serviceTypeName: row.service_type_name,
    serviceTypeBillingUnit: row.service_type_billing_unit,
    equipmentId: row.equipment_id,
    equipmentName: row.equipment_name,
    equipmentTypeName: row.equipment_type_name,
    equipmentBrand: row.equipment_brand,
    equipmentModel: row.equipment_model,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    serviceDescription: row.service_description,
    serviceDate: row.service_date.slice(0, 10),
    plannedStartTime: row.planned_start_time.slice(0, 5),
    plannedEndTime: row.planned_end_time.slice(0, 5),
    actualStartTime: row.actual_start_time ? row.actual_start_time.slice(0, 5) : null,
    actualEndTime: row.actual_end_time ? row.actual_end_time.slice(0, 5) : null,
    quotedValue: row.quoted_value === null ? null : Number(row.quoted_value),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceOrderRow(row: ServiceOrderRow): ManagedServiceOrder {
  const items = JSON.parse(row.items_json || "[]") as ServiceOrderItemRow[];

  return {
    id: row.id,
    number: row.number,
    originType: row.origin_type,
    sourceBudgetId: row.source_budget_id,
    sourceBudgetNumber: row.source_budget_number,
    status: row.status,
    clientId: row.client_id,
    clientName: row.client_name,
    servicePostalCode: row.service_postal_code,
    serviceStreet: row.service_street,
    serviceNumber: row.service_number,
    serviceComplement: row.service_complement,
    serviceDistrict: row.service_district,
    serviceCity: row.service_city,
    serviceState: row.service_state,
    serviceCountry: row.service_country,
    notes: row.notes,
    itemCount: Number(row.item_count),
    items: items.map(mapServiceOrderItemRow),
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudgetStatusHistoryRow(row: BudgetStatusHistoryRow): ManagedBudgetStatusHistory {
  return {
    id: row.id,
    budgetId: row.budget_id,
    budgetNumber: row.budget_number,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    reason: row.reason,
    actorUserId: row.actor_user_id,
    actorNameSnapshot: row.actor_name_snapshot,
    actorEmailSnapshot: row.actor_email_snapshot,
    createdAt: row.created_at,
  };
}

function mapServiceOrderStatusHistoryRow(row: ServiceOrderStatusHistoryRow): ManagedServiceOrderStatusHistory {
  return {
    id: row.id,
    serviceOrderId: row.service_order_id,
    serviceOrderNumber: row.service_order_number,
    previousStatus: row.previous_status,
    nextStatus: row.next_status,
    reason: row.reason,
    actorUserId: row.actor_user_id,
    actorNameSnapshot: row.actor_name_snapshot,
    actorEmailSnapshot: row.actor_email_snapshot,
    createdAt: row.created_at,
  };
}

function normalizeStatusActor(actor?: StatusActorInput | null) {
  return {
    userId: actor?.userId ?? null,
    name: actor?.name?.trim() || null,
    email: actor?.email?.trim().toLowerCase() || null,
  };
}

function formatBudgetNumber(sequence: number) {
  return `ORC-${sequence.toString().padStart(6, "0")}`;
}

function formatServiceOrderNumber(sequence: number) {
  return `OS-${sequence.toString().padStart(6, "0")}`;
}

function formatMaintenanceRequisitionNumber(sequence: number) {
  return `REQ-MN-${sequence.toString().padStart(6, "0")}`;
}

function formatFuelRequisitionNumber(sequence: number) {
  return `REQ-AB-${sequence.toString().padStart(6, "0")}`;
}

function formatPartsRequisitionNumber(sequence: number) {
  return `REQ-PC-${sequence.toString().padStart(6, "0")}`;
}

async function assertBudgetRelationsExist(input: {
  clientId: string;
  items: BudgetServiceItemInput[];
}) {
  const serviceTypeIds = [...new Set(input.items.map((item) => item.serviceTypeId))];
  const equipmentIds = [...new Set(input.items.map((item) => item.equipmentId))];
  const operatorIds = [...new Set(input.items.map((item) => item.operatorId))];

  const [clientResult, equipmentResult, serviceTypeResult, operatorResult] = await Promise.all([
    pool.query<{ id: string }>(`SELECT id FROM clients WHERE id = $1 LIMIT 1`, [input.clientId]),
    pool.query<{ id: string }>(`SELECT id FROM equipment WHERE id = ANY($1::text[])`, [equipmentIds]),
    pool.query<BudgetServiceTypeSnapshotRow>(
      `
        SELECT id, billing_unit, base_value::text, minimum_hours::text, minimum_km::text
        FROM service_types
        WHERE id = ANY($1::text[])
      `,
      [serviceTypeIds],
    ),
    pool.query<{ id: string }>(`SELECT id FROM operators WHERE id = ANY($1::text[])`, [operatorIds]),
  ]);

  if (!clientResult.rows[0]) {
    throw new Error("Client not found.");
  }

  if (equipmentResult.rows.length !== equipmentIds.length) {
    throw new Error("One or more equipment items were not found.");
  }

  if (serviceTypeResult.rows.length !== serviceTypeIds.length) {
    throw new Error("One or more service types were not found.");
  }

  if (operatorResult.rows.length !== operatorIds.length) {
    throw new Error("One or more operators were not found.");
  }

  return new Map(serviceTypeResult.rows.map((row) => [row.id, row]));
}

function getPrimaryBudgetItem(items: BudgetServiceItemInput[]) {
  const primaryItem = items[0];

  if (!primaryItem) {
    throw new Error("Add at least one service item.");
  }

  return primaryItem;
}

function normalizeBudgetItemValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

async function insertBudgetStatusHistory(
  client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
  input: {
    budgetId: string | null;
    budgetNumber: string;
    previousStatus: BudgetStatus | null;
    nextStatus: BudgetStatus;
    reason?: string | null;
    actor?: StatusActorInput | null;
  },
) {
  const actor = normalizeStatusActor(input.actor);

  await client.query(
    `
      INSERT INTO budget_status_history (
        id,
        budget_id,
        budget_number,
        previous_status,
        next_status,
        reason,
        actor_user_id,
        actor_name_snapshot,
        actor_email_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      randomUUID(),
      input.budgetId,
      input.budgetNumber,
      input.previousStatus,
      input.nextStatus,
      input.reason?.trim() || null,
      actor.userId,
      actor.name,
      actor.email,
    ],
  );
}

async function insertServiceOrderStatusHistory(
  client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
  input: {
    serviceOrderId: string | null;
    serviceOrderNumber: string;
    previousStatus: ServiceOrderStatus | null;
    nextStatus: ServiceOrderStatus;
    reason?: string | null;
    actor?: StatusActorInput | null;
  },
) {
  const actor = normalizeStatusActor(input.actor);

  await client.query(
    `
      INSERT INTO service_order_status_history (
        id,
        service_order_id,
        service_order_number,
        previous_status,
        next_status,
        reason,
        actor_user_id,
        actor_name_snapshot,
        actor_email_snapshot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      randomUUID(),
      input.serviceOrderId,
      input.serviceOrderNumber,
      input.previousStatus,
      input.nextStatus,
      input.reason?.trim() || null,
      actor.userId,
      actor.name,
      actor.email,
    ],
  );
}

async function replaceBudgetItems(
  client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
  budgetId: string,
  items: BudgetServiceItemInput[],
  serviceTypeMap: Map<string, BudgetServiceTypeSnapshotRow>,
) {
  await client.query(`DELETE FROM budget_items WHERE budget_id = $1`, [budgetId]);

  for (const [index, item] of items.entries()) {
    const serviceType = serviceTypeMap.get(item.serviceTypeId);

    if (!serviceType) {
      throw new Error("Service type not found.");
    }

    await client.query(
      `
        INSERT INTO budget_items (
          id,
          budget_id,
          position,
          service_type_id,
          equipment_id,
          operator_id,
          service_description,
          service_date,
          start_time,
          end_time,
          billing_unit,
          base_value,
          minimum_hours,
          minimum_km,
          initial_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        randomUUID(),
        budgetId,
        index,
        item.serviceTypeId,
        item.equipmentId,
        item.operatorId,
        item.serviceDescription.trim(),
        item.serviceDate,
        item.startTime,
        item.endTime,
        serviceType.billing_unit,
        Number(serviceType.base_value),
        normalizeBudgetItemValue(serviceType.minimum_hours),
        normalizeBudgetItemValue(serviceType.minimum_km),
        item.initialValue,
      ],
    );
  }
}

async function assertServiceOrderRelationsExist(input: {
  clientId: string;
  sourceBudgetId?: string;
  items: ServiceOrderItemInput[];
}) {
  const serviceTypeIds = [...new Set(input.items.map((item) => item.serviceTypeId))];
  const equipmentIds = [...new Set(input.items.map((item) => item.equipmentId))];
  const operatorIds = [...new Set(input.items.map((item) => item.operatorId))];
  const sourceBudgetItemIds = [...new Set(input.items.map((item) => item.sourceBudgetItemId).filter(Boolean))];

  const [clientResult, equipmentResult, serviceTypeResult, operatorResult, sourceBudgetResult, sourceBudgetItemsResult] = await Promise.all([
    pool.query<{ id: string; display_name: string }>(
      `
        SELECT id, COALESCE(NULLIF(trade_name, ''), legal_name) AS display_name
        FROM clients
        WHERE id = $1
        LIMIT 1
      `,
      [input.clientId],
    ),
    pool.query<{ id: string }>(`SELECT id FROM equipment WHERE id = ANY($1::text[])`, [equipmentIds]),
    pool.query<BudgetServiceTypeSnapshotRow>(
      `
        SELECT id, billing_unit, base_value::text, minimum_hours::text, minimum_km::text
        FROM service_types
        WHERE id = ANY($1::text[])
      `,
      [serviceTypeIds],
    ),
    pool.query<{ id: string }>(`SELECT id FROM operators WHERE id = ANY($1::text[])`, [operatorIds]),
    input.sourceBudgetId
      ? pool.query<{ id: string; number: string; status: string }>(
        `SELECT id, number, status FROM budgets WHERE id = $1 LIMIT 1`,
        [input.sourceBudgetId],
      )
      : Promise.resolve({ rows: [] }),
    sourceBudgetItemIds.length > 0
      ? pool.query<{ id: string }>(`SELECT id FROM budget_items WHERE id = ANY($1::text[])`, [sourceBudgetItemIds])
      : Promise.resolve({ rows: [] }),
  ]);

  const clientRow = clientResult.rows[0];

  if (!clientRow) {
    throw new Error("Client not found.");
  }

  if (equipmentResult.rows.length !== equipmentIds.length) {
    throw new Error("One or more equipment items were not found.");
  }

  if (serviceTypeResult.rows.length !== serviceTypeIds.length) {
    throw new Error("One or more service types were not found.");
  }

  if (operatorResult.rows.length !== operatorIds.length) {
    throw new Error("One or more operators were not found.");
  }

  if (sourceBudgetItemIds.length > 0 && sourceBudgetItemsResult.rows.length !== sourceBudgetItemIds.length) {
    throw new Error("One or more linked budget items were not found.");
  }

  const sourceBudget = input.sourceBudgetId ? sourceBudgetResult.rows[0] : null;

  if (input.sourceBudgetId && !sourceBudget) {
    throw new Error("Budget not found.");
  }

  if (sourceBudget && sourceBudget.status !== "approved") {
    throw new Error("Only approved budgets can originate service orders.");
  }

  return {
    clientName: clientRow.display_name,
    sourceBudgetNumber: sourceBudget?.number ?? null,
    serviceTypeMap: new Map(serviceTypeResult.rows.map((row) => [row.id, row])),
  };
}

async function replaceServiceOrderItems(
  client: { query: (queryText: string, values?: unknown[]) => Promise<unknown> },
  serviceOrderId: string,
  items: ServiceOrderItemInput[],
  serviceTypeMap: Map<string, BudgetServiceTypeSnapshotRow>,
) {
  await client.query(`DELETE FROM service_order_items WHERE service_order_id = $1`, [serviceOrderId]);

  for (const [index, item] of items.entries()) {
    const serviceType = serviceTypeMap.get(item.serviceTypeId);

    if (!serviceType) {
      throw new Error("Service type not found.");
    }

    await client.query(
      `
        INSERT INTO service_order_items (
          id,
          service_order_id,
          position,
          source_budget_item_id,
          service_type_id,
          equipment_id,
          operator_id,
          service_description,
          service_date,
          planned_start_time,
          planned_end_time,
          actual_start_time,
          actual_end_time,
          quoted_value,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        randomUUID(),
        serviceOrderId,
        index,
        item.sourceBudgetItemId ?? null,
        item.serviceTypeId,
        item.equipmentId,
        item.operatorId,
        item.serviceDescription.trim(),
        item.serviceDate,
        item.plannedStartTime,
        item.plannedEndTime,
        item.actualStartTime ?? null,
        item.actualEndTime ?? null,
        item.quotedValue ?? null,
        item.notes?.trim() || null,
      ],
    );
  }
}

function assertServiceDatesNotInPast(items: Array<{ serviceDate: string }>) {
  const invalidItem = items.find((item) => isDateBeforeToday(item.serviceDate));

  if (invalidItem) {
    throw new Error("Service date cannot be earlier than today.");
  }
}

async function createServiceOrderFromApprovedBudget(
  client: { query: <T = unknown>(queryText: string, values?: unknown[]) => Promise<{ rows: T[] }> },
  budget: ManagedBudget,
  actor?: StatusActorInput | null,
) {
  if (budget.status !== "approved") {
    throw new Error("Only approved budgets can generate service orders.");
  }

  assertServiceDatesNotInPast(budget.items);

  const existingResult = await client.query<{ id: string }>(
    `
      SELECT id
      FROM service_orders
      WHERE source_budget_id = $1
      LIMIT 1
    `,
    [budget.id],
  );

  if (existingResult.rows[0]) {
    return existingResult.rows[0].id;
  }

  const serviceTypeIds = [...new Set(budget.items.map((item) => item.serviceTypeId))];
  const serviceTypeResult = await client.query<BudgetServiceTypeSnapshotRow>(
    `
      SELECT id, billing_unit, base_value::text, minimum_hours::text, minimum_km::text
      FROM service_types
      WHERE id = ANY($1::text[])
    `,
    [serviceTypeIds],
  );

  const serviceTypeMap = new Map(serviceTypeResult.rows.map((row) => [row.id, row]));
  const sequenceResult = await client.query<{ max_sequence: string }>(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 4) AS integer)), 0)::text AS max_sequence
      FROM service_orders
    `,
  );

  const nextSequence = Number(sequenceResult.rows[0]?.max_sequence ?? "0") + 1;
  const serviceOrderId = randomUUID();
  const serviceOrderNumber = formatServiceOrderNumber(nextSequence);

  await client.query(
    `
      INSERT INTO service_orders (
        id,
        number,
        origin_type,
        source_budget_id,
        source_budget_number,
        status,
        client_id,
        client_name,
        service_postal_code,
        service_street,
        service_number,
        service_complement,
        service_district,
        service_city,
        service_state,
        service_country,
        notes
      )
      VALUES (
        $1, $2, 'budget', $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `,
    [
      serviceOrderId,
      serviceOrderNumber,
      budget.id,
      budget.number,
      budget.clientId,
      budget.clientName,
      budget.servicePostalCode,
      budget.serviceStreet,
      budget.serviceNumber,
      budget.serviceComplement,
      budget.serviceDistrict,
      budget.serviceCity,
      budget.serviceState,
      budget.serviceCountry,
      budget.notes,
    ],
  );

  await replaceServiceOrderItems(
    client,
    serviceOrderId,
    budget.items.map((item) => ({
      sourceBudgetItemId: item.id,
      serviceTypeId: item.serviceTypeId,
      equipmentId: item.equipmentId,
      operatorId: item.operatorId,
      serviceDescription: item.serviceDescription,
      serviceDate: item.serviceDate,
      plannedStartTime: item.startTime,
      plannedEndTime: item.endTime,
      actualStartTime: undefined,
      actualEndTime: undefined,
      quotedValue: item.initialValue,
      notes: undefined,
    })),
    serviceTypeMap,
  );

  await insertServiceOrderStatusHistory(client, {
    serviceOrderId,
    serviceOrderNumber,
    previousStatus: null,
    nextStatus: "pending",
    actor,
  });

  return serviceOrderId;
}

export async function listAssignableRoles() {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `
      SELECT id, name, slug, description, is_system
      FROM roles
      ORDER BY is_system DESC, name ASC
    `,
  );

  return result.rows.map(mapRoleRow);
}

export async function getCompany() {
  await bootstrapRbac();
  const result = await pool.query<CompanyRow>(
    `
      SELECT
        id,
        app_name,
        legal_name,
        trade_name,
        cnpj,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM company
      WHERE singleton_key = true
      LIMIT 1
    `,
  );

  const row = result.rows[0];
  return row ? mapCompanyRow(row) : null;
}

export async function upsertCompany(input: {
  appName?: string;
  legalName: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  website?: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  country: string;
}) {
  await bootstrapRbac();
  const existing = await getCompany();

  if (existing) {
    await pool.query(
      `
        UPDATE company
        SET app_name = $2,
            legal_name = $3,
            trade_name = $4,
            cnpj = $5,
            email = $6,
            phone = $7,
            website = $8,
            postal_code = $9,
            street = $10,
            number = $11,
            complement = $12,
            district = $13,
            city = $14,
            state = $15,
            country = $16,
            updated_at = now()
        WHERE id = $1
      `,
      [
        existing.id,
        input.appName?.trim() || null,
        input.legalName.trim(),
        input.tradeName?.trim() || null,
        input.cnpj,
        input.email.trim().toLowerCase(),
        input.phone.trim(),
        input.website?.trim() || null,
        input.postalCode,
        input.street.trim(),
        input.number.trim(),
        input.complement?.trim() || null,
        input.district.trim(),
        input.city.trim(),
        input.state.trim(),
        input.country.trim() || "Brasil",
      ],
    );

    return existing.id;
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO company (
        id,
        singleton_key,
        app_name,
        legal_name,
        trade_name,
        cnpj,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country
      )
      VALUES ($1, true, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      id,
      input.appName?.trim() || null,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.cnpj,
      input.email.trim().toLowerCase(),
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );

  return id;
}

export async function listClients() {
  await bootstrapRbac();
  const result = await pool.query<ClientRow>(
    `
      SELECT
        id,
        person_type,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM clients
      ORDER BY updated_at DESC, legal_name ASC
    `,
  );

  return result.rows.map(mapClientRow);
}

export async function getClientById(clientId: string) {
  await bootstrapRbac();
  const result = await pool.query<ClientRow>(
    `
      SELECT
        id,
        person_type,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM clients
      WHERE id = $1
      LIMIT 1
    `,
    [clientId],
  );

  const row = result.rows[0];
  return row ? mapClientRow(row) : null;
}

export async function createClient(input: {
  personType: "PF" | "PJ";
  status: "active" | "inactive";
  legalName: string;
  tradeName?: string;
  document: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  phone: string;
  website?: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  country: string;
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE document = $1 LIMIT 1`,
    [input.document],
  );

  if (duplicate.rows[0]) {
    throw new Error("A client with this document already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO clients (
        id,
        person_type,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `,
    [
      id,
      input.personType,
      input.status,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document,
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );

  return id;
}

export async function updateClient(
  clientId: string,
  input: {
    personType: "PF" | "PJ";
    status: "active" | "inactive";
    legalName: string;
    tradeName?: string;
    document: string;
    contactName?: string;
    contactPhone?: string;
    email?: string;
    phone: string;
    website?: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    country: string;
  },
) {
  await bootstrapRbac();
  const current = await getClientById(clientId);

  if (!current) {
    throw new Error("Client not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM clients WHERE document = $1 AND id <> $2 LIMIT 1`,
    [input.document, clientId],
  );

  if (duplicate.rows[0]) {
    throw new Error("A client with this document already exists.");
  }

  await pool.query(
    `
      UPDATE clients
      SET person_type = $2,
          status = $3,
          legal_name = $4,
          trade_name = $5,
          document = $6,
          contact_name = $7,
          contact_phone = $8,
          email = $9,
          phone = $10,
          website = $11,
          postal_code = $12,
          street = $13,
          number = $14,
          complement = $15,
          district = $16,
          city = $17,
          state = $18,
          country = $19,
          updated_at = now()
      WHERE id = $1
    `,
    [
      clientId,
      input.personType,
      input.status,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document,
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode,
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim() || "Brasil",
    ],
  );
}

export async function deleteClient(clientId: string) {
  await bootstrapRbac();
  const current = await getClientById(clientId);

  if (!current) {
    throw new Error("Client not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budgets WHERE client_id = $1`,
    [clientId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this client before deleting it.");
  }

  await pool.query(`DELETE FROM clients WHERE id = $1`, [clientId]);
}

export async function listOperators() {
  await bootstrapRbac();
  const result = await pool.query<OperatorRow>(
    `
      SELECT
        id,
        name,
        phone,
        license,
        status,
        created_at,
        updated_at
      FROM operators
      ORDER BY updated_at DESC, name ASC
    `,
  );

  return result.rows.map(mapOperatorRow);
}

export async function getOperatorById(operatorId: string) {
  await bootstrapRbac();
  const result = await pool.query<OperatorRow>(
    `
      SELECT
        id,
        name,
        phone,
        license,
        status,
        created_at,
        updated_at
      FROM operators
      WHERE id = $1
      LIMIT 1
    `,
    [operatorId],
  );

  const row = result.rows[0];
  return row ? mapOperatorRow(row) : null;
}

export async function createOperator(input: {
  name: string;
  phone: string;
  license: "A" | "B" | "C" | "D" | "E";
  status: "active" | "inactive";
}) {
  await bootstrapRbac();
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO operators (
        id,
        name,
        phone,
        license,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      id,
      input.name.trim(),
      input.phone.trim(),
      input.license,
      input.status,
    ],
  );

  return id;
}

export async function updateOperator(
  operatorId: string,
  input: {
    name: string;
    phone: string;
    license: "A" | "B" | "C" | "D" | "E";
    status: "active" | "inactive";
  },
) {
  await bootstrapRbac();
  const current = await getOperatorById(operatorId);

  if (!current) {
    throw new Error("Operator not found.");
  }

  await pool.query(
    `
      UPDATE operators
      SET name = $2,
          phone = $3,
          license = $4,
          status = $5,
          updated_at = now()
      WHERE id = $1
    `,
    [
      operatorId,
      input.name.trim(),
      input.phone.trim(),
      input.license,
      input.status,
    ],
  );
}

export async function deleteOperator(operatorId: string) {
  await bootstrapRbac();
  const current = await getOperatorById(operatorId);

  if (!current) {
    throw new Error("Operator not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE operator_id = $1`,
    [operatorId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this operator before deleting it.");
  }

  await pool.query(`DELETE FROM operators WHERE id = $1`, [operatorId]);
}

export async function listEquipmentTypes() {
  await bootstrapRbac();
  const result = await pool.query<EquipmentTypeRow & { equipment_count: string }>(
    `
      SELECT et.id, et.name, et.description, et.created_at, et.updated_at, COUNT(e.id)::text AS equipment_count
      FROM equipment_types et
      LEFT JOIN equipment e ON e.type_id = et.id
      GROUP BY et.id, et.name, et.description, et.created_at, et.updated_at
      ORDER BY et.name ASC
    `,
  );

  return result.rows.map(mapEquipmentTypeRow);
}

export async function getEquipmentTypeById(typeId: string) {
  await bootstrapRbac();
  const result = await pool.query<EquipmentTypeRow>(
    `
      SELECT id, name, description, created_at, updated_at
      FROM equipment_types
      WHERE id = $1
      LIMIT 1
    `,
    [typeId],
  );

  const row = result.rows[0];
  return row ? mapEquipmentTypeRow(row) : null;
}

export async function createEquipmentType(input: {
  name: string;
  description?: string;
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM equipment_types WHERE lower(name) = lower($1) LIMIT 1`,
    [input.name],
  );

  if (duplicate.rows[0]) {
    throw new Error("An equipment type with this name already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO equipment_types (id, name, description)
      VALUES ($1, $2, $3)
    `,
    [id, input.name.trim(), input.description?.trim() || null],
  );

  return id;
}

export async function updateEquipmentType(
  typeId: string,
  input: {
    name: string;
    description?: string;
  },
) {
  await bootstrapRbac();
  const current = await getEquipmentTypeById(typeId);

  if (!current) {
    throw new Error("Equipment type not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM equipment_types WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
    [input.name, typeId],
  );

  if (duplicate.rows[0]) {
    throw new Error("An equipment type with this name already exists.");
  }

  await pool.query(
    `
      UPDATE equipment_types
      SET name = $2,
          description = $3,
          updated_at = now()
      WHERE id = $1
    `,
    [typeId, input.name.trim(), input.description?.trim() || null],
  );
}

export async function deleteEquipmentType(typeId: string) {
  await bootstrapRbac();
  const current = await getEquipmentTypeById(typeId);

  if (!current) {
    throw new Error("Equipment type not found.");
  }

  const inUse = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM equipment WHERE type_id = $1`,
    [typeId],
  );

  if (Number(inUse.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove equipment linked to this type before deleting it.");
  }

  await pool.query(`DELETE FROM equipment_types WHERE id = $1`, [typeId]);
}

export async function listEquipment() {
  await bootstrapRbac();
  const result = await pool.query<EquipmentRow>(
    `
      SELECT
        e.id,
        e.type_id,
        et.name AS type_name,
        e.status,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.lifting_capacity_tons,
        e.created_at,
        e.updated_at
      FROM equipment e
      INNER JOIN equipment_types et ON et.id = e.type_id
      ORDER BY e.updated_at DESC, e.name ASC
    `,
  );

  return result.rows.map(mapEquipmentRow);
}

export async function getEquipmentById(equipmentId: string) {
  await bootstrapRbac();
  const result = await pool.query<EquipmentRow>(
    `
      SELECT
        e.id,
        e.type_id,
        et.name AS type_name,
        e.status,
        e.license_required,
        e.name,
        e.model,
        e.brand,
        e.year,
        e.plate,
        e.lifting_capacity_tons,
        e.created_at,
        e.updated_at
      FROM equipment e
      INNER JOIN equipment_types et ON et.id = e.type_id
      WHERE e.id = $1
      LIMIT 1
    `,
    [equipmentId],
  );

  const row = result.rows[0];
  return row ? mapEquipmentRow(row) : null;
}

export async function createEquipment(input: {
  typeId: string;
  status: "active" | "inactive";
  licenseRequired: "A" | "B" | "C" | "D" | "E";
  name: string;
  model: string;
  brand: string;
  year: number;
  plate?: string;
  liftingCapacityTons?: number;
}) {
  await bootstrapRbac();
  const type = await getEquipmentTypeById(input.typeId);

  if (!type) {
    throw new Error("Equipment type not found.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO equipment (id, type_id, status, license_required, name, model, brand, year, plate, lifting_capacity_tons)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      id,
      input.typeId,
      input.status,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
      input.liftingCapacityTons ?? null,
    ],
  );

  return id;
}

export async function updateEquipment(
  equipmentId: string,
  input: {
    typeId: string;
    status: "active" | "inactive";
    licenseRequired: "A" | "B" | "C" | "D" | "E";
    name: string;
    model: string;
    brand: string;
    year: number;
    plate?: string;
    liftingCapacityTons?: number;
  },
) {
  await bootstrapRbac();
  const current = await getEquipmentById(equipmentId);

  if (!current) {
    throw new Error("Equipment not found.");
  }

  const type = await getEquipmentTypeById(input.typeId);

  if (!type) {
    throw new Error("Equipment type not found.");
  }

  await pool.query(
    `
      UPDATE equipment
      SET type_id = $2,
          status = $3,
          license_required = $4,
          name = $5,
          model = $6,
          brand = $7,
          year = $8,
          plate = $9,
          lifting_capacity_tons = $10,
          updated_at = now()
      WHERE id = $1
    `,
    [
      equipmentId,
      input.typeId,
      input.status,
      input.licenseRequired,
      input.name.trim(),
      input.model.trim(),
      input.brand.trim(),
      input.year,
      input.plate?.trim() || null,
      input.liftingCapacityTons ?? null,
    ],
  );
}

export async function deleteEquipment(equipmentId: string) {
  await bootstrapRbac();
  const current = await getEquipmentById(equipmentId);

  if (!current) {
    throw new Error("Equipment not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this equipment before deleting it.");
  }

  const maintenanceCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM maintenance_records WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(maintenanceCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove maintenance records linked to this equipment before deleting it.");
  }

  const fuelCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM fuel_records WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(fuelCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove fuel records linked to this equipment before deleting it.");
  }

  const maintenanceReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM maintenance_requisitions WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(maintenanceReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove maintenance requisitions linked to this equipment before deleting it.");
  }

  const fuelReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM fuel_requisitions WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(fuelReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove fuel requisitions linked to this equipment before deleting it.");
  }

  const partsReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM parts_requisitions WHERE equipment_id = $1`,
    [equipmentId],
  );

  if (Number(partsReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove parts requisitions linked to this equipment before deleting it.");
  }

  await pool.query(`DELETE FROM equipment WHERE id = $1`, [equipmentId]);
}

export async function listEquipmentOptions(): Promise<EquipmentOption[]> {
  await bootstrapRbac();
  const result = await pool.query<Pick<EquipmentRow, "id" | "name" | "brand" | "model">>(
    `
      SELECT id, name, brand, model
      FROM equipment
      ORDER BY name ASC, brand ASC, model ASC
    `,
  );

  return result.rows;
}

async function assertEquipmentExists(equipmentId: string) {
  const equipment = await getEquipmentById(equipmentId);

  if (!equipment) {
    throw new Error("Equipment not found.");
  }
}

export async function listMaintenanceRecords(): Promise<ManagedMaintenanceRecord[]> {
  await bootstrapRbac();
  const result = await pool.query<MaintenanceRecordRow>(
    `
      SELECT
        mr.id,
        mr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        mr.maintenance_type,
        mr.status,
        mr.financial_status,
        mr.planned_date::text,
        mr.performed_date::text,
        mr.description,
        mr.supplier_name,
        mr.document_number,
        mr.notes,
        mr.amount_total::text,
        mr.payment_due_date::text,
        mr.paid_at::text,
        mr.meter_kind,
        mr.meter_value::text,
        mr.created_at,
        mr.updated_at
      FROM maintenance_records mr
      INNER JOIN equipment e ON e.id = mr.equipment_id
      ORDER BY mr.planned_date DESC, mr.updated_at DESC
    `,
  );

  return result.rows.map(mapMaintenanceRecordRow);
}

export async function getMaintenanceRecordById(recordId: string): Promise<ManagedMaintenanceRecord | null> {
  await bootstrapRbac();
  const result = await pool.query<MaintenanceRecordRow>(
    `
      SELECT
        mr.id,
        mr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        mr.maintenance_type,
        mr.status,
        mr.financial_status,
        mr.planned_date::text,
        mr.performed_date::text,
        mr.description,
        mr.supplier_name,
        mr.document_number,
        mr.notes,
        mr.amount_total::text,
        mr.payment_due_date::text,
        mr.paid_at::text,
        mr.meter_kind,
        mr.meter_value::text,
        mr.created_at,
        mr.updated_at
      FROM maintenance_records mr
      INNER JOIN equipment e ON e.id = mr.equipment_id
      WHERE mr.id = $1
      LIMIT 1
    `,
    [recordId],
  );

  const row = result.rows[0];
  return row ? mapMaintenanceRecordRow(row) : null;
}

export async function createMaintenanceRecord(input: {
  equipmentId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  financialStatus: MaintenanceFinancialStatus;
  plannedDate: string;
  performedDate?: string;
  description: string;
  supplierName?: string;
  documentNumber?: string;
  notes?: string;
  amountTotal?: number;
  paymentDueDate?: string;
  paidAt?: string;
  meterKind?: MaintenanceMeterKind;
  meterValue?: number;
}) {
  await bootstrapRbac();
  await assertEquipmentExists(input.equipmentId);

  const id = randomUUID();
  const financialStatus = input.status === "cancelled" ? "cancelled" : input.financialStatus;

  await pool.query(
    `
      INSERT INTO maintenance_records (
        id,
        equipment_id,
        maintenance_type,
        status,
        financial_status,
        planned_date,
        performed_date,
        description,
        supplier_name,
        document_number,
        notes,
        amount_total,
        payment_due_date,
        paid_at,
        meter_kind,
        meter_value
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `,
    [
      id,
      input.equipmentId,
      input.maintenanceType,
      input.status,
      financialStatus,
      input.plannedDate,
      input.performedDate ?? null,
      input.description.trim(),
      input.supplierName?.trim() || null,
      input.documentNumber?.trim() || null,
      input.notes?.trim() || null,
      input.amountTotal ?? null,
      input.paymentDueDate ?? null,
      financialStatus === "paid" ? input.paidAt ?? null : null,
      input.meterKind ?? null,
      input.meterValue ?? null,
    ],
  );

  return id;
}

export async function updateMaintenanceRecord(
  recordId: string,
  input: {
    equipmentId: string;
    maintenanceType: MaintenanceType;
    status: MaintenanceStatus;
    financialStatus: MaintenanceFinancialStatus;
    plannedDate: string;
    performedDate?: string;
    description: string;
    supplierName?: string;
    documentNumber?: string;
    notes?: string;
    amountTotal?: number;
    paymentDueDate?: string;
    paidAt?: string;
    meterKind?: MaintenanceMeterKind;
    meterValue?: number;
  },
) {
  await bootstrapRbac();
  const current = await getMaintenanceRecordById(recordId);

  if (!current) {
    throw new Error("Maintenance record not found.");
  }

  await assertEquipmentExists(input.equipmentId);

  const financialStatus = input.status === "cancelled" ? "cancelled" : input.financialStatus;

  await pool.query(
    `
      UPDATE maintenance_records
      SET equipment_id = $2,
          maintenance_type = $3,
          status = $4,
          financial_status = $5,
          planned_date = $6,
          performed_date = $7,
          description = $8,
          supplier_name = $9,
          document_number = $10,
          notes = $11,
          amount_total = $12,
          payment_due_date = $13,
          paid_at = $14,
          meter_kind = $15,
          meter_value = $16,
          updated_at = now()
      WHERE id = $1
    `,
    [
      recordId,
      input.equipmentId,
      input.maintenanceType,
      input.status,
      financialStatus,
      input.plannedDate,
      input.performedDate ?? null,
      input.description.trim(),
      input.supplierName?.trim() || null,
      input.documentNumber?.trim() || null,
      input.notes?.trim() || null,
      input.amountTotal ?? null,
      input.paymentDueDate ?? null,
      financialStatus === "paid" ? input.paidAt ?? null : null,
      input.meterKind ?? null,
      input.meterValue ?? null,
    ],
  );
}

export async function updateMaintenanceRecordStatus(
  recordId: string,
  input: {
    status: MaintenanceStatus;
    performedDate?: string;
    amountTotal?: number;
  },
) {
  await bootstrapRbac();
  const current = await getMaintenanceRecordById(recordId);

  if (!current) {
    throw new Error("Maintenance record not found.");
  }

  const nextFinancialStatus =
    input.status === "cancelled" ? "cancelled" : current.financialStatus;
  const nextPaidAt = input.status === "cancelled" ? null : current.paidAt;

  await pool.query(
    `
      UPDATE maintenance_records
      SET status = $2,
          financial_status = $3,
          performed_date = $4,
          amount_total = $5,
          paid_at = $6,
          updated_at = now()
      WHERE id = $1
    `,
    [
      recordId,
      input.status,
      nextFinancialStatus,
      input.status === "completed"
        ? input.performedDate ?? current.performedDate
        : input.status === "planned"
          ? null
          : current.performedDate,
      input.status === "completed"
        ? input.amountTotal ?? current.amountTotal
        : input.status === "planned"
          ? current.amountTotal
          : current.amountTotal,
      nextPaidAt,
    ],
  );
}

export async function updateMaintenanceRecordPayment(
  recordId: string,
  input: {
    financialStatus: MaintenanceFinancialStatus;
    paymentDueDate?: string;
    paidAt?: string;
  },
) {
  await bootstrapRbac();
  const current = await getMaintenanceRecordById(recordId);

  if (!current) {
    throw new Error("Maintenance record not found.");
  }

  if (current.status === "cancelled" && input.financialStatus !== "cancelled") {
    throw new Error("Cancelled maintenance cannot have active financial status.");
  }

  await pool.query(
    `
      UPDATE maintenance_records
      SET financial_status = $2,
          payment_due_date = $3,
          paid_at = $4,
          updated_at = now()
      WHERE id = $1
    `,
    [
      recordId,
      input.financialStatus,
      input.paymentDueDate ?? null,
      input.financialStatus === "paid" ? input.paidAt ?? null : null,
    ],
  );
}

export async function deleteMaintenanceRecord(recordId: string) {
  await bootstrapRbac();
  const current = await getMaintenanceRecordById(recordId);

  if (!current) {
    throw new Error("Maintenance record not found.");
  }

  await pool.query(`DELETE FROM maintenance_records WHERE id = $1`, [recordId]);
}

export async function listFuelRecords(): Promise<ManagedFuelRecord[]> {
  await bootstrapRbac();
  const result = await pool.query<
    FuelRecordRow & {
      previous_meter_kind: FuelMeterKind | null;
      previous_meter_reading: string | number | null;
    }
  >(
    `
      SELECT
        fr.id,
        fr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        fr.fuel_date::text,
        fr.financial_status,
        fr.fuel_type,
        fr.total_amount::text,
        fr.liters::text,
        fr.meter_kind,
        fr.meter_reading::text,
        fr.supplier_name,
        fr.document_number,
        fr.notes,
        fr.payment_due_date::text,
        fr.paid_at::text,
        fr.created_at,
        fr.updated_at,
        previous.previous_meter_kind,
        previous.previous_meter_reading
      FROM fuel_records fr
      LEFT JOIN equipment e ON e.id = fr.equipment_id
      LEFT JOIN LATERAL (
        SELECT
          prev.meter_kind AS previous_meter_kind,
          prev.meter_reading::text AS previous_meter_reading
        FROM fuel_records prev
        WHERE prev.equipment_id = fr.equipment_id
          AND prev.id <> fr.id
          AND prev.meter_kind = fr.meter_kind
          AND prev.meter_reading IS NOT NULL
          AND (
            prev.fuel_date < fr.fuel_date
            OR (prev.fuel_date = fr.fuel_date AND prev.created_at < fr.created_at)
          )
        ORDER BY prev.fuel_date DESC, prev.created_at DESC
        LIMIT 1
      ) previous ON true
      ORDER BY fr.fuel_date DESC, fr.updated_at DESC
    `,
  );

  return result.rows.map((row) =>
    mapFuelRecordRow(row, {
      meter_kind: row.previous_meter_kind,
      meter_reading: row.previous_meter_reading,
    }),
  );
}

export async function getFuelRecordById(recordId: string): Promise<ManagedFuelRecord | null> {
  const records = await listFuelRecords();
  return records.find((record) => record.id === recordId) ?? null;
}

export async function createFuelRecord(input: {
  equipmentId?: string;
  fuelDate: string;
  financialStatus: FuelFinancialStatus;
  fuelType?: FuelType;
  totalAmount: number;
  liters?: number;
  meterKind?: FuelMeterKind;
  meterReading?: number;
  supplierName?: string;
  documentNumber?: string;
  notes?: string;
  paymentDueDate?: string;
  paidAt?: string;
}) {
  await bootstrapRbac();

  if (input.equipmentId) {
    await assertEquipmentExists(input.equipmentId);
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO fuel_records (
        id,
        equipment_id,
        fuel_date,
        financial_status,
        fuel_type,
        total_amount,
        liters,
        meter_kind,
        meter_reading,
        supplier_name,
        document_number,
        notes,
        payment_due_date,
        paid_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      id,
      input.equipmentId ?? null,
      input.fuelDate,
      input.financialStatus,
      input.fuelType ?? null,
      input.totalAmount,
      input.liters ?? null,
      input.meterKind ?? null,
      input.meterReading ?? null,
      input.supplierName?.trim() || null,
      input.documentNumber?.trim() || null,
      input.notes?.trim() || null,
      input.paymentDueDate ?? null,
      input.financialStatus === "paid" ? input.paidAt ?? null : null,
    ],
  );

  return id;
}

export async function updateFuelRecord(
  recordId: string,
  input: {
    equipmentId?: string;
    fuelDate: string;
    financialStatus: FuelFinancialStatus;
    fuelType?: FuelType;
    totalAmount: number;
    liters?: number;
    meterKind?: FuelMeterKind;
    meterReading?: number;
    supplierName?: string;
    documentNumber?: string;
    notes?: string;
    paymentDueDate?: string;
    paidAt?: string;
  },
) {
  await bootstrapRbac();
  const current = await getFuelRecordById(recordId);

  if (!current) {
    throw new Error("Fuel record not found.");
  }

  if (input.equipmentId) {
    await assertEquipmentExists(input.equipmentId);
  }

  await pool.query(
    `
      UPDATE fuel_records
      SET equipment_id = $2,
          fuel_date = $3,
          financial_status = $4,
          fuel_type = $5,
          total_amount = $6,
          liters = $7,
          meter_kind = $8,
          meter_reading = $9,
          supplier_name = $10,
          document_number = $11,
          notes = $12,
          payment_due_date = $13,
          paid_at = $14,
          updated_at = now()
      WHERE id = $1
    `,
    [
      recordId,
      input.equipmentId ?? null,
      input.fuelDate,
      input.financialStatus,
      input.fuelType ?? null,
      input.totalAmount,
      input.liters ?? null,
      input.meterKind ?? null,
      input.meterReading ?? null,
      input.supplierName?.trim() || null,
      input.documentNumber?.trim() || null,
      input.notes?.trim() || null,
      input.paymentDueDate ?? null,
      input.financialStatus === "paid" ? input.paidAt ?? null : null,
    ],
  );
}

export async function updateFuelRecordPayment(
  recordId: string,
  input: {
    financialStatus: FuelFinancialStatus;
    paymentDueDate?: string;
    paidAt?: string;
  },
) {
  await bootstrapRbac();
  const current = await getFuelRecordById(recordId);

  if (!current) {
    throw new Error("Fuel record not found.");
  }

  await pool.query(
    `
      UPDATE fuel_records
      SET financial_status = $2,
          payment_due_date = $3,
          paid_at = $4,
          updated_at = now()
      WHERE id = $1
    `,
    [
      recordId,
      input.financialStatus,
      input.paymentDueDate ?? null,
      input.financialStatus === "paid" ? input.paidAt ?? null : null,
    ],
  );
}

export async function deleteFuelRecord(recordId: string) {
  await bootstrapRbac();
  const current = await getFuelRecordById(recordId);

  if (!current) {
    throw new Error("Fuel record not found.");
  }

  await pool.query(`DELETE FROM fuel_records WHERE id = $1`, [recordId]);
}

async function assertSupplierExists(supplierId: string) {
  const supplier = await getSupplierById(supplierId);

  if (!supplier) {
    throw new Error("Supplier not found.");
  }
}

async function nextMaintenanceRequisitionNumber() {
  const result = await pool.query<{ max_sequence: string }>(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 8) AS integer)), 0)::text AS max_sequence
      FROM maintenance_requisitions
      WHERE number LIKE 'REQ-MN-%'
    `,
  );

  const current = Number(result.rows[0]?.max_sequence ?? "0");
  return formatMaintenanceRequisitionNumber(current + 1);
}

async function nextFuelRequisitionNumber() {
  const result = await pool.query<{ max_sequence: string }>(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 8) AS integer)), 0)::text AS max_sequence
      FROM fuel_requisitions
      WHERE number LIKE 'REQ-AB-%'
    `,
  );

  const current = Number(result.rows[0]?.max_sequence ?? "0");
  return formatFuelRequisitionNumber(current + 1);
}

async function nextPartsRequisitionNumber() {
  const result = await pool.query<{ max_sequence: string }>(
    `
      SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 8) AS integer)), 0)::text AS max_sequence
      FROM parts_requisitions
      WHERE number LIKE 'REQ-PC-%'
    `,
  );

  const current = Number(result.rows[0]?.max_sequence ?? "0");
  return formatPartsRequisitionNumber(current + 1);
}

export async function listSuppliers(): Promise<ManagedSupplier[]> {
  await bootstrapRbac();
  const result = await pool.query<SupplierRow>(
    `
      SELECT
        id,
        supplier_type,
        supplier_types,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM suppliers
      ORDER BY updated_at DESC, legal_name ASC
    `,
  );

  return result.rows.map(mapSupplierRow);
}

export async function listSupplierOptions(onlyActive = true): Promise<SupplierOption[]> {
  await bootstrapRbac();
  const query = onlyActive
    ? `
        SELECT id, legal_name, trade_name, supplier_type, supplier_types, status
        FROM suppliers
        WHERE status = $1
        ORDER BY legal_name ASC
      `
    : `
        SELECT id, legal_name, trade_name, supplier_type, supplier_types, status
        FROM suppliers
        ORDER BY legal_name ASC
      `;
  const params = onlyActive ? ["active"] : [];
  const result = await pool.query<Pick<SupplierRow, "id" | "legal_name" | "trade_name" | "supplier_type" | "supplier_types" | "status">>(
    query,
    params,
  );

  return result.rows.map(mapSupplierOptionRow);
}

export async function getSupplierById(supplierId: string): Promise<ManagedSupplier | null> {
  await bootstrapRbac();
  const result = await pool.query<SupplierRow>(
    `
      SELECT
        id,
        supplier_type,
        supplier_types,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country,
        created_at,
        updated_at
      FROM suppliers
      WHERE id = $1
      LIMIT 1
    `,
    [supplierId],
  );

  const row = result.rows[0];
  return row ? mapSupplierRow(row) : null;
}

export async function createSupplier(input: {
  supplierTypes: SupplierType[];
  status: SupplierStatus;
  legalName: string;
  tradeName?: string;
  document: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  phone: string;
  website?: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  country: string;
}) {
  await bootstrapRbac();

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM suppliers WHERE lower(legal_name) = lower($1) AND document = $2 LIMIT 1`,
    [input.legalName, input.document],
  );

  if (duplicate.rows[0]) {
    throw new Error("A supplier with this legal name and document already exists.");
  }

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO suppliers (
        id,
        supplier_type,
        supplier_types,
        status,
        legal_name,
        trade_name,
        document,
        contact_name,
        contact_phone,
        email,
        phone,
        website,
        postal_code,
        street,
        number,
        complement,
        district,
        city,
        state,
        country
      )
      VALUES ($1, $2, $3::text[], $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `,
    [
      id,
      input.supplierTypes[0],
      input.supplierTypes,
      input.status,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document.trim(),
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode.trim(),
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim(),
    ],
  );

  return id;
}

export async function updateSupplier(
  supplierId: string,
  input: {
    supplierTypes: SupplierType[];
    status: SupplierStatus;
    legalName: string;
    tradeName?: string;
    document: string;
    contactName?: string;
    contactPhone?: string;
    email?: string;
    phone: string;
    website?: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    country: string;
  },
) {
  await bootstrapRbac();
  const current = await getSupplierById(supplierId);

  if (!current) {
    throw new Error("Supplier not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM suppliers WHERE lower(legal_name) = lower($1) AND document = $2 AND id <> $3 LIMIT 1`,
    [input.legalName, input.document, supplierId],
  );

  if (duplicate.rows[0]) {
    throw new Error("A supplier with this legal name and document already exists.");
  }

  await pool.query(
    `
      UPDATE suppliers
      SET supplier_type = $2,
          supplier_types = $3::text[],
          status = $4,
          legal_name = $5,
          trade_name = $6,
          document = $7,
          contact_name = $8,
          contact_phone = $9,
          email = $10,
          phone = $11,
          website = $12,
          postal_code = $13,
          street = $14,
          number = $15,
          complement = $16,
          district = $17,
          city = $18,
          state = $19,
          country = $20,
          updated_at = now()
      WHERE id = $1
    `,
    [
      supplierId,
      input.supplierTypes[0],
      input.supplierTypes,
      input.status,
      input.legalName.trim(),
      input.tradeName?.trim() || null,
      input.document.trim(),
      input.contactName?.trim() || null,
      input.contactPhone?.trim() || null,
      input.email?.trim().toLowerCase() || null,
      input.phone.trim(),
      input.website?.trim() || null,
      input.postalCode.trim(),
      input.street.trim(),
      input.number.trim(),
      input.complement?.trim() || null,
      input.district.trim(),
      input.city.trim(),
      input.state.trim(),
      input.country.trim(),
    ],
  );
}

export async function deleteSupplier(supplierId: string) {
  await bootstrapRbac();
  const current = await getSupplierById(supplierId);

  if (!current) {
    throw new Error("Supplier not found.");
  }

  const maintenanceReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM maintenance_requisitions WHERE supplier_id = $1`,
    [supplierId],
  );

  if (Number(maintenanceReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove maintenance requisitions linked to this supplier before deleting it.");
  }

  const fuelReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM fuel_requisitions WHERE supplier_id = $1`,
    [supplierId],
  );

  if (Number(fuelReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove fuel requisitions linked to this supplier before deleting it.");
  }

  const partsReqCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM parts_requisitions WHERE supplier_id = $1`,
    [supplierId],
  );

  if (Number(partsReqCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove parts requisitions linked to this supplier before deleting it.");
  }

  await pool.query(`DELETE FROM suppliers WHERE id = $1`, [supplierId]);
}

type RequisitionRequester = {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
};

function normalizeRequester(requester?: RequisitionRequester) {
  return {
    userId: requester?.userId ?? null,
    name: requester?.name?.trim() || null,
    email: requester?.email?.trim().toLowerCase() || null,
  };
}

function assertValidRequisitionStatusTransition(current: RequisitionStatus, next: RequisitionStatus) {
  if (current === next) {
    return;
  }

  if (current === "draft" && next === "issued") {
    return;
  }

  if (current === "issued" && (next === "completed" || next === "cancelled")) {
    return;
  }

  throw new Error("This requisition status transition is not allowed.");
}

export async function listMaintenanceRequisitions(): Promise<ManagedMaintenanceRequisition[]> {
  await bootstrapRbac();
  const result = await pool.query<MaintenanceRequisitionRow>(
    `
      SELECT
        mr.id,
        mr.number,
        mr.revision_number,
        mr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        mr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        mr.requester_user_id,
        mr.requester_name_snapshot,
        mr.requester_email_snapshot,
        mr.status,
        mr.scheduled_date::text,
        mr.description,
        mr.notes,
        mr.completion_notes,
        mr.issued_at,
        mr.last_issued_at,
        mr.completed_at::text,
        mr.cancelled_at,
        mr.created_at,
        mr.updated_at
      FROM maintenance_requisitions mr
      INNER JOIN equipment e ON e.id = mr.equipment_id
      INNER JOIN suppliers s ON s.id = mr.supplier_id
      ORDER BY mr.updated_at DESC, mr.number DESC
    `,
  );

  return result.rows.map(mapMaintenanceRequisitionRow);
}

export async function getMaintenanceRequisitionById(id: string): Promise<ManagedMaintenanceRequisition | null> {
  await bootstrapRbac();
  const result = await pool.query<MaintenanceRequisitionRow>(
    `
      SELECT
        mr.id,
        mr.number,
        mr.revision_number,
        mr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        mr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        mr.requester_user_id,
        mr.requester_name_snapshot,
        mr.requester_email_snapshot,
        mr.status,
        mr.scheduled_date::text,
        mr.description,
        mr.notes,
        mr.completion_notes,
        mr.issued_at,
        mr.last_issued_at,
        mr.completed_at::text,
        mr.cancelled_at,
        mr.created_at,
        mr.updated_at
      FROM maintenance_requisitions mr
      INNER JOIN equipment e ON e.id = mr.equipment_id
      INNER JOIN suppliers s ON s.id = mr.supplier_id
      WHERE mr.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapMaintenanceRequisitionRow(row) : null;
}

export async function createMaintenanceRequisition(input: {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  description: string;
  notes?: string;
  requester?: RequisitionRequester;
}) {
  await bootstrapRbac();
  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const number = await nextMaintenanceRequisitionNumber();
  const normalizedRequester = normalizeRequester(input.requester);
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO maintenance_requisitions (
        id,
        number,
        revision_number,
        equipment_id,
        supplier_id,
        requester_user_id,
        requester_name_snapshot,
        requester_email_snapshot,
        status,
        scheduled_date,
        description,
        notes,
        issued_at,
        last_issued_at
      )
      VALUES ($1, $2, 1, $3, $4, $5, $6, $7, 'issued', $8, $9, $10, now(), now())
    `,
    [
      id,
      number,
      input.equipmentId,
      input.supplierId,
      normalizedRequester.userId,
      normalizedRequester.name,
      normalizedRequester.email,
      input.scheduledDate,
      input.description.trim(),
      input.notes?.trim() || null,
    ],
  );

  return id;
}

export async function updateMaintenanceRequisition(
  id: string,
  input: {
    equipmentId: string;
    supplierId: string;
    scheduledDate: string;
    description: string;
    notes?: string;
  },
) {
  await bootstrapRbac();
  const current = await getMaintenanceRequisitionById(id);

  if (!current) {
    throw new Error("Maintenance requisition not found.");
  }

  if (current.status === "completed" || current.status === "cancelled") {
    throw new Error("Completed or cancelled requisitions cannot be edited.");
  }

  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const revisionIncrement = current.status === "issued" ? 1 : 0;
  await pool.query(
    `
      UPDATE maintenance_requisitions
      SET equipment_id = $2,
          supplier_id = $3,
          scheduled_date = $4,
          description = $5,
          notes = $6,
          revision_number = revision_number + $7,
          last_issued_at = CASE WHEN status = 'issued' THEN now() ELSE last_issued_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.equipmentId,
      input.supplierId,
      input.scheduledDate,
      input.description.trim(),
      input.notes?.trim() || null,
      revisionIncrement,
    ],
  );
}

export async function updateMaintenanceRequisitionStatus(
  id: string,
  input: UpdateMaintenanceRequisitionStatusInput,
) {
  await bootstrapRbac();
  const current = await getMaintenanceRequisitionById(id);

  if (!current) {
    throw new Error("Maintenance requisition not found.");
  }

  assertValidRequisitionStatusTransition(current.status, input.status);

  await pool.query(
    `
      UPDATE maintenance_requisitions
      SET status = $2,
          issued_at = CASE WHEN $2 = 'issued' AND issued_at IS NULL THEN now() ELSE issued_at END,
          last_issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE last_issued_at END,
          completed_at = CASE WHEN $2 = 'completed' THEN $3::date ELSE completed_at END,
          completion_notes = CASE
            WHEN $2 = 'completed' THEN $4
            WHEN $2 = 'cancelled' THEN $4
            ELSE completion_notes
          END,
          cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.status,
      input.completedAt ?? null,
      input.completionNotes?.trim() || null,
    ],
  );
}

export async function deleteMaintenanceRequisition(id: string) {
  await bootstrapRbac();
  const current = await getMaintenanceRequisitionById(id);

  if (!current) {
    throw new Error("Maintenance requisition not found.");
  }

  if (current.status !== "draft") {
    throw new Error("Only draft requisitions can be deleted.");
  }

  await pool.query(`DELETE FROM maintenance_requisitions WHERE id = $1`, [id]);
}

export async function listFuelRequisitions(): Promise<ManagedFuelRequisition[]> {
  await bootstrapRbac();
  const result = await pool.query<FuelRequisitionRow>(
    `
      SELECT
        fr.id,
        fr.number,
        fr.revision_number,
        fr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        fr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        fr.requester_user_id,
        fr.requester_name_snapshot,
        fr.requester_email_snapshot,
        fr.status,
        fr.scheduled_date::text,
        fr.fuel_type,
        fr.notes,
        fr.completion_notes,
        fr.issued_at,
        fr.last_issued_at,
        fr.completed_at::text,
        fr.cancelled_at,
        fr.created_at,
        fr.updated_at
      FROM fuel_requisitions fr
      INNER JOIN equipment e ON e.id = fr.equipment_id
      INNER JOIN suppliers s ON s.id = fr.supplier_id
      ORDER BY fr.updated_at DESC, fr.number DESC
    `,
  );

  return result.rows.map(mapFuelRequisitionRow);
}

export async function getFuelRequisitionById(id: string): Promise<ManagedFuelRequisition | null> {
  await bootstrapRbac();
  const result = await pool.query<FuelRequisitionRow>(
    `
      SELECT
        fr.id,
        fr.number,
        fr.revision_number,
        fr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        fr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        fr.requester_user_id,
        fr.requester_name_snapshot,
        fr.requester_email_snapshot,
        fr.status,
        fr.scheduled_date::text,
        fr.fuel_type,
        fr.notes,
        fr.completion_notes,
        fr.issued_at,
        fr.last_issued_at,
        fr.completed_at::text,
        fr.cancelled_at,
        fr.created_at,
        fr.updated_at
      FROM fuel_requisitions fr
      INNER JOIN equipment e ON e.id = fr.equipment_id
      INNER JOIN suppliers s ON s.id = fr.supplier_id
      WHERE fr.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapFuelRequisitionRow(row) : null;
}

export async function createFuelRequisition(input: {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  fuelType?: FuelType;
  notes?: string;
  requester?: RequisitionRequester;
}) {
  await bootstrapRbac();
  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const number = await nextFuelRequisitionNumber();
  const normalizedRequester = normalizeRequester(input.requester);
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO fuel_requisitions (
        id,
        number,
        revision_number,
        equipment_id,
        supplier_id,
        requester_user_id,
        requester_name_snapshot,
        requester_email_snapshot,
        status,
        scheduled_date,
        fuel_type,
        notes,
        issued_at,
        last_issued_at
      )
      VALUES ($1, $2, 1, $3, $4, $5, $6, $7, 'issued', $8, $9, $10, now(), now())
    `,
    [
      id,
      number,
      input.equipmentId,
      input.supplierId,
      normalizedRequester.userId,
      normalizedRequester.name,
      normalizedRequester.email,
      input.scheduledDate,
      input.fuelType ?? null,
      input.notes?.trim() || null,
    ],
  );

  return id;
}

export async function updateFuelRequisition(
  id: string,
  input: {
    equipmentId: string;
    supplierId: string;
    scheduledDate: string;
    fuelType?: FuelType;
    notes?: string;
  },
) {
  await bootstrapRbac();
  const current = await getFuelRequisitionById(id);

  if (!current) {
    throw new Error("Fuel requisition not found.");
  }

  if (current.status === "completed" || current.status === "cancelled") {
    throw new Error("Completed or cancelled requisitions cannot be edited.");
  }

  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const revisionIncrement = current.status === "issued" ? 1 : 0;
  await pool.query(
    `
      UPDATE fuel_requisitions
      SET equipment_id = $2,
          supplier_id = $3,
          scheduled_date = $4,
          fuel_type = $5,
          notes = $6,
          revision_number = revision_number + $7,
          last_issued_at = CASE WHEN status = 'issued' THEN now() ELSE last_issued_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.equipmentId,
      input.supplierId,
      input.scheduledDate,
      input.fuelType ?? null,
      input.notes?.trim() || null,
      revisionIncrement,
    ],
  );
}

export async function updateFuelRequisitionStatus(
  id: string,
  input: UpdateFuelRequisitionStatusInput,
) {
  await bootstrapRbac();
  const current = await getFuelRequisitionById(id);

  if (!current) {
    throw new Error("Fuel requisition not found.");
  }

  assertValidRequisitionStatusTransition(current.status, input.status);

  await pool.query(
    `
      UPDATE fuel_requisitions
      SET status = $2,
          issued_at = CASE WHEN $2 = 'issued' AND issued_at IS NULL THEN now() ELSE issued_at END,
          last_issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE last_issued_at END,
          completed_at = CASE WHEN $2 = 'completed' THEN $3::date ELSE completed_at END,
          completion_notes = CASE
            WHEN $2 = 'completed' THEN $4
            WHEN $2 = 'cancelled' THEN $4
            ELSE completion_notes
          END,
          cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.status,
      input.completedAt ?? null,
      input.completionNotes?.trim() || null,
    ],
  );
}

export async function deleteFuelRequisition(id: string) {
  await bootstrapRbac();
  const current = await getFuelRequisitionById(id);

  if (!current) {
    throw new Error("Fuel requisition not found.");
  }

  if (current.status !== "draft") {
    throw new Error("Only draft requisitions can be deleted.");
  }

  await pool.query(`DELETE FROM fuel_requisitions WHERE id = $1`, [id]);
}

export async function listPartsRequisitions(): Promise<ManagedPartsRequisition[]> {
  await bootstrapRbac();
  const result = await pool.query<PartsRequisitionRow>(
    `
      SELECT
        pr.id,
        pr.number,
        pr.revision_number,
        pr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        pr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        pr.requester_user_id,
        pr.requester_name_snapshot,
        pr.requester_email_snapshot,
        pr.status,
        pr.scheduled_date::text,
        pr.description,
        pr.notes,
        pr.completion_notes,
        pr.issued_at,
        pr.last_issued_at,
        pr.completed_at::text,
        pr.cancelled_at,
        pr.created_at,
        pr.updated_at
      FROM parts_requisitions pr
      INNER JOIN equipment e ON e.id = pr.equipment_id
      INNER JOIN suppliers s ON s.id = pr.supplier_id
      ORDER BY pr.updated_at DESC, pr.number DESC
    `,
  );

  return result.rows.map(mapPartsRequisitionRow);
}

export async function getPartsRequisitionById(id: string): Promise<ManagedPartsRequisition | null> {
  await bootstrapRbac();
  const result = await pool.query<PartsRequisitionRow>(
    `
      SELECT
        pr.id,
        pr.number,
        pr.revision_number,
        pr.equipment_id,
        e.name AS equipment_name,
        e.brand AS equipment_brand,
        e.model AS equipment_model,
        pr.supplier_id,
        s.legal_name AS supplier_name,
        s.supplier_types,
        pr.requester_user_id,
        pr.requester_name_snapshot,
        pr.requester_email_snapshot,
        pr.status,
        pr.scheduled_date::text,
        pr.description,
        pr.notes,
        pr.completion_notes,
        pr.issued_at,
        pr.last_issued_at,
        pr.completed_at::text,
        pr.cancelled_at,
        pr.created_at,
        pr.updated_at
      FROM parts_requisitions pr
      INNER JOIN equipment e ON e.id = pr.equipment_id
      INNER JOIN suppliers s ON s.id = pr.supplier_id
      WHERE pr.id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = result.rows[0];
  return row ? mapPartsRequisitionRow(row) : null;
}

export async function createPartsRequisition(input: {
  equipmentId: string;
  supplierId: string;
  scheduledDate: string;
  description: string;
  notes?: string;
  requester?: RequisitionRequester;
}) {
  await bootstrapRbac();
  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const number = await nextPartsRequisitionNumber();
  const normalizedRequester = normalizeRequester(input.requester);
  const id = randomUUID();

  await pool.query(
    `
      INSERT INTO parts_requisitions (
        id,
        number,
        revision_number,
        equipment_id,
        supplier_id,
        requester_user_id,
        requester_name_snapshot,
        requester_email_snapshot,
        status,
        scheduled_date,
        description,
        notes,
        issued_at,
        last_issued_at
      )
      VALUES ($1, $2, 1, $3, $4, $5, $6, $7, 'issued', $8, $9, $10, now(), now())
    `,
    [
      id,
      number,
      input.equipmentId,
      input.supplierId,
      normalizedRequester.userId,
      normalizedRequester.name,
      normalizedRequester.email,
      input.scheduledDate,
      input.description.trim(),
      input.notes?.trim() || null,
    ],
  );

  return id;
}

export async function updatePartsRequisition(
  id: string,
  input: {
    equipmentId: string;
    supplierId: string;
    scheduledDate: string;
    description: string;
    notes?: string;
  },
) {
  await bootstrapRbac();
  const current = await getPartsRequisitionById(id);

  if (!current) {
    throw new Error("Parts requisition not found.");
  }

  if (current.status === "completed" || current.status === "cancelled") {
    throw new Error("Completed or cancelled requisitions cannot be edited.");
  }

  await assertEquipmentExists(input.equipmentId);
  await assertSupplierExists(input.supplierId);

  const revisionIncrement = current.status === "issued" ? 1 : 0;
  await pool.query(
    `
      UPDATE parts_requisitions
      SET equipment_id = $2,
          supplier_id = $3,
          scheduled_date = $4,
          description = $5,
          notes = $6,
          revision_number = revision_number + $7,
          last_issued_at = CASE WHEN status = 'issued' THEN now() ELSE last_issued_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.equipmentId,
      input.supplierId,
      input.scheduledDate,
      input.description.trim(),
      input.notes?.trim() || null,
      revisionIncrement,
    ],
  );
}

export async function updatePartsRequisitionStatus(
  id: string,
  input: UpdatePartsRequisitionStatusInput,
) {
  await bootstrapRbac();
  const current = await getPartsRequisitionById(id);

  if (!current) {
    throw new Error("Parts requisition not found.");
  }

  assertValidRequisitionStatusTransition(current.status, input.status);

  await pool.query(
    `
      UPDATE parts_requisitions
      SET status = $2,
          issued_at = CASE WHEN $2 = 'issued' AND issued_at IS NULL THEN now() ELSE issued_at END,
          last_issued_at = CASE WHEN $2 = 'issued' THEN now() ELSE last_issued_at END,
          completed_at = CASE WHEN $2 = 'completed' THEN $3::date ELSE completed_at END,
          completion_notes = CASE
            WHEN $2 = 'completed' THEN $4
            WHEN $2 = 'cancelled' THEN $4
            ELSE completion_notes
          END,
          cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
          updated_at = now()
      WHERE id = $1
    `,
    [
      id,
      input.status,
      input.completedAt ?? null,
      input.completionNotes?.trim() || null,
    ],
  );
}

export async function deletePartsRequisition(id: string) {
  await bootstrapRbac();
  const current = await getPartsRequisitionById(id);

  if (!current) {
    throw new Error("Parts requisition not found.");
  }

  if (current.status !== "draft") {
    throw new Error("Only draft requisitions can be deleted.");
  }

  await pool.query(`DELETE FROM parts_requisitions WHERE id = $1`, [id]);
}

export async function listServiceTypes() {
  await bootstrapRbac();
  const result = await pool.query<ServiceTypeRow>(
    `
      SELECT
        st.id,
        st.name,
        st.description,
        st.status,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text,
        st.created_at,
        st.updated_at,
        COALESCE(array_agg(ste.equipment_id ORDER BY e.name, e.brand, e.model) FILTER (WHERE ste.equipment_id IS NOT NULL), '{}') AS equipment_ids,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'brand', e.brand,
              'model', e.model
            )
            ORDER BY e.name, e.brand, e.model
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        )::text AS equipment_json,
        COUNT(ste.equipment_id)::text AS equipment_count
      FROM service_types st
      LEFT JOIN service_type_equipment ste ON ste.service_type_id = st.id
      LEFT JOIN equipment e ON e.id = ste.equipment_id
      GROUP BY st.id, st.name, st.description, st.status, st.billing_unit, st.base_value, st.minimum_hours, st.minimum_km, st.created_at, st.updated_at
      ORDER BY st.updated_at DESC, st.name ASC
    `,
  );

  return result.rows.map(mapServiceTypeRow);
}

export async function getServiceTypeById(serviceTypeId: string) {
  await bootstrapRbac();
  const result = await pool.query<ServiceTypeRow>(
    `
      SELECT
        st.id,
        st.name,
        st.description,
        st.status,
        st.billing_unit,
        st.base_value::text,
        st.minimum_hours::text,
        st.minimum_km::text,
        st.created_at,
        st.updated_at,
        COALESCE(array_agg(ste.equipment_id ORDER BY e.name, e.brand, e.model) FILTER (WHERE ste.equipment_id IS NOT NULL), '{}') AS equipment_ids,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'name', e.name,
              'brand', e.brand,
              'model', e.model
            )
            ORDER BY e.name, e.brand, e.model
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'::json
        )::text AS equipment_json,
        COUNT(ste.equipment_id)::text AS equipment_count
      FROM service_types st
      LEFT JOIN service_type_equipment ste ON ste.service_type_id = st.id
      LEFT JOIN equipment e ON e.id = ste.equipment_id
      WHERE st.id = $1
      GROUP BY st.id, st.name, st.description, st.status, st.billing_unit, st.base_value, st.minimum_hours, st.minimum_km, st.created_at, st.updated_at
      LIMIT 1
    `,
    [serviceTypeId],
  );

  const row = result.rows[0];
  return row ? mapServiceTypeRow(row) : null;
}

async function assertEquipmentIdsExist(equipmentIds: string[]) {
  if (equipmentIds.length === 0) {
    return;
  }

  const result = await pool.query<{ id: string }>(
    `SELECT id FROM equipment WHERE id = ANY($1::text[])`,
    [equipmentIds],
  );

  if (result.rows.length !== new Set(equipmentIds).size) {
    throw new Error("One or more linked equipment items were not found.");
  }
}

export async function createServiceType(input: {
  name: string;
  description?: string;
  status: "active" | "inactive";
  billingUnit:
    | "hour"
    | "daily"
    | "monthly"
    | "annual"
    | "km"
    | "freight"
    | "mobilization_demobilization"
    | "counterweight_transport";
  baseValue: number;
  minimumHours?: number;
  minimumKm?: number;
  equipmentIds: string[];
}) {
  await bootstrapRbac();
  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM service_types WHERE lower(name) = lower($1) LIMIT 1`,
    [input.name],
  );

  if (duplicate.rows[0]) {
    throw new Error("A service type with this name already exists.");
  }

  const equipmentIds = [...new Set(input.equipmentIds)];
  await assertEquipmentIdsExist(equipmentIds);

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO service_types (id, name, description, status, billing_unit, base_value, minimum_hours, minimum_km)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      id,
      input.name.trim(),
      input.description?.trim() || null,
      input.status,
      input.billingUnit,
      input.baseValue,
      input.minimumHours ?? null,
      input.minimumKm ?? null,
    ],
  );

  for (const equipmentId of equipmentIds) {
    await pool.query(
      `
        INSERT INTO service_type_equipment (service_type_id, equipment_id)
        VALUES ($1, $2)
      `,
      [id, equipmentId],
    );
  }

  return id;
}

export async function updateServiceType(
  serviceTypeId: string,
  input: {
    name: string;
    description?: string;
    status: "active" | "inactive";
    billingUnit:
      | "hour"
      | "daily"
      | "monthly"
      | "annual"
      | "km"
      | "freight"
      | "mobilization_demobilization"
      | "counterweight_transport";
    baseValue: number;
    minimumHours?: number;
    minimumKm?: number;
    equipmentIds: string[];
  },
) {
  await bootstrapRbac();
  const current = await getServiceTypeById(serviceTypeId);

  if (!current) {
    throw new Error("Service type not found.");
  }

  const duplicate = await pool.query<{ id: string }>(
    `SELECT id FROM service_types WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
    [input.name, serviceTypeId],
  );

  if (duplicate.rows[0]) {
    throw new Error("A service type with this name already exists.");
  }

  const equipmentIds = [...new Set(input.equipmentIds)];
  await assertEquipmentIdsExist(equipmentIds);

  await pool.query(
    `
      UPDATE service_types
      SET name = $2,
          description = $3,
          status = $4,
          billing_unit = $5,
          base_value = $6,
          minimum_hours = $7,
          minimum_km = $8,
          updated_at = now()
      WHERE id = $1
    `,
    [
      serviceTypeId,
      input.name.trim(),
      input.description?.trim() || null,
      input.status,
      input.billingUnit,
      input.baseValue,
      input.minimumHours ?? null,
      input.minimumKm ?? null,
    ],
  );

  await pool.query(`DELETE FROM service_type_equipment WHERE service_type_id = $1`, [serviceTypeId]);

  for (const equipmentId of equipmentIds) {
    await pool.query(
      `
        INSERT INTO service_type_equipment (service_type_id, equipment_id)
        VALUES ($1, $2)
      `,
      [serviceTypeId, equipmentId],
    );
  }
}

export async function deleteServiceType(serviceTypeId: string) {
  await bootstrapRbac();
  const current = await getServiceTypeById(serviceTypeId);

  if (!current) {
    throw new Error("Service type not found.");
  }

  const budgetsCount = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM budget_items WHERE service_type_id = $1`,
    [serviceTypeId],
  );

  if (Number(budgetsCount.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove budgets linked to this service type before deleting it.");
  }

  const linked = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM service_type_equipment WHERE service_type_id = $1`,
    [serviceTypeId],
  );

  if (Number(linked.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove linked equipment before deleting this service type.");
  }

  await pool.query(`DELETE FROM service_types WHERE id = $1`, [serviceTypeId]);
}

export async function listBudgets(): Promise<ManagedBudget[]> {
  await bootstrapRbac();
  const result = await pool.query<BudgetRow>(
    `
      SELECT
        b.id,
        b.number,
        b.status,
        b.client_id,
        COALESCE(NULLIF(c.trade_name, ''), c.legal_name) AS client_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value::text,
        b.manual_adjustment::text,
        b.total_value::text,
        COUNT(bi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bi.id,
              'position', bi.position,
              'service_type_id', bi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', bi.billing_unit,
              'equipment_id', bi.equipment_id,
              'equipment_name', e.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', bi.operator_id,
              'operator_name', o.name,
              'service_description', bi.service_description,
              'service_date', bi.service_date::text,
              'start_time', bi.start_time::text,
              'end_time', bi.end_time::text,
              'base_value', bi.base_value::text,
              'minimum_hours', bi.minimum_hours::text,
              'minimum_km', bi.minimum_km::text,
              'initial_value', bi.initial_value::text,
              'created_at', bi.created_at,
              'updated_at', bi.updated_at
            )
            ORDER BY bi.position
          ) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      FROM budgets b
      INNER JOIN clients c ON c.id = b.client_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      LEFT JOIN equipment e ON e.id = bi.equipment_id
      LEFT JOIN service_types st ON st.id = bi.service_type_id
      LEFT JOIN operators o ON o.id = bi.operator_id
      GROUP BY
        b.id,
        b.number,
        b.status,
        b.client_id,
        c.trade_name,
        c.legal_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value,
        b.manual_adjustment,
        b.total_value,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      ORDER BY b.number DESC
    `,
  );

  return result.rows.map(mapBudgetRow);
}

export async function getBudgetById(budgetId: string): Promise<ManagedBudget | null> {
  await bootstrapRbac();
  const result = await pool.query<BudgetRow>(
    `
      SELECT
        b.id,
        b.number,
        b.status,
        b.client_id,
        COALESCE(NULLIF(c.trade_name, ''), c.legal_name) AS client_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value::text,
        b.manual_adjustment::text,
        b.total_value::text,
        COUNT(bi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', bi.id,
              'position', bi.position,
              'service_type_id', bi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', bi.billing_unit,
              'equipment_id', bi.equipment_id,
              'equipment_name', e.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', bi.operator_id,
              'operator_name', o.name,
              'service_description', bi.service_description,
              'service_date', bi.service_date::text,
              'start_time', bi.start_time::text,
              'end_time', bi.end_time::text,
              'base_value', bi.base_value::text,
              'minimum_hours', bi.minimum_hours::text,
              'minimum_km', bi.minimum_km::text,
              'initial_value', bi.initial_value::text,
              'created_at', bi.created_at,
              'updated_at', bi.updated_at
            )
            ORDER BY bi.position
          ) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
      FROM budgets b
      INNER JOIN clients c ON c.id = b.client_id
      LEFT JOIN budget_items bi ON bi.budget_id = b.id
      LEFT JOIN equipment e ON e.id = bi.equipment_id
      LEFT JOIN service_types st ON st.id = bi.service_type_id
      LEFT JOIN operators o ON o.id = bi.operator_id
      WHERE b.id = $1
      GROUP BY
        b.id,
        b.number,
        b.status,
        b.client_id,
        c.trade_name,
        c.legal_name,
        b.service_postal_code,
        b.service_street,
        b.service_number,
        b.service_complement,
        b.service_district,
        b.service_city,
        b.service_state,
        b.service_country,
        b.subtotal_value,
        b.manual_adjustment,
        b.total_value,
        b.notes,
        b.approved_at,
        b.cancelled_at,
        b.created_at,
        b.updated_at
    `,
    [budgetId],
  );

  const row = result.rows[0];
  return row ? mapBudgetRow(row) : null;
}

export async function listBudgetStatusHistory(budgetId: string): Promise<ManagedBudgetStatusHistory[]> {
  await bootstrapRbac();
  const result = await pool.query<BudgetStatusHistoryRow>(
    `
      SELECT
        id,
        budget_id,
        budget_number,
        previous_status,
        next_status,
        reason,
        actor_user_id,
        actor_name_snapshot,
        actor_email_snapshot,
        created_at
      FROM budget_status_history
      WHERE budget_id = $1
      ORDER BY created_at DESC
    `,
    [budgetId],
  );

  return result.rows.map(mapBudgetStatusHistoryRow);
}

export async function createBudget(input: {
  clientId: string;
  servicePostalCode: string;
  serviceStreet: string;
  serviceNumber: string;
  serviceComplement?: string;
  serviceDistrict: string;
  serviceCity: string;
  serviceState: string;
  serviceCountry: string;
  manualAdjustment: number;
  notes?: string;
  items: BudgetServiceItemInput[];
}, actor?: StatusActorInput | null) {
  await bootstrapRbac();
  assertServiceDatesNotInPast(input.items);
  const serviceTypeMap = await assertBudgetRelationsExist(input);

  const id = randomUUID();
  const primaryItem = getPrimaryBudgetItem(input.items);
  const subtotalValue = calculateBudgetSubtotal(input.items);
  const totalValue = calculateBudgetTotal(subtotalValue, input.manualAdjustment);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE budgets IN EXCLUSIVE MODE");

    const sequenceResult = await client.query<{ max_sequence: string }>(
      `
        SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 5) AS integer)), 0)::text AS max_sequence
        FROM budgets
      `,
    );

    const nextSequence = Number(sequenceResult.rows[0]?.max_sequence ?? "0") + 1;
    const number = formatBudgetNumber(nextSequence);

    await client.query(
      `
        INSERT INTO budgets (
          id,
          number,
          status,
          client_id,
          equipment_id,
          service_type_id,
          operator_id,
          service_description,
          service_date,
          start_time,
          end_time,
          service_postal_code,
          service_street,
          service_number,
          service_complement,
          service_district,
          service_city,
          service_state,
          service_country,
          initial_value,
          manual_adjustment,
          subtotal_value,
          total_value,
          notes
        )
        VALUES (
          $1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        )
      `,
      [
        id,
        number,
        input.clientId,
        primaryItem.equipmentId,
        primaryItem.serviceTypeId,
        primaryItem.operatorId,
        primaryItem.serviceDescription.trim(),
        primaryItem.serviceDate,
        primaryItem.startTime,
        primaryItem.endTime,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        primaryItem.initialValue,
        input.manualAdjustment ?? 0,
        subtotalValue,
        totalValue,
        input.notes?.trim() || null,
      ],
    );

    await replaceBudgetItems(client, id, input.items, serviceTypeMap);
    await insertBudgetStatusHistory(client, {
      budgetId: id,
      budgetNumber: number,
      previousStatus: null,
      nextStatus: "pending",
      actor,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return id;
}

export async function updateBudget(
  budgetId: string,
  input: {
    clientId: string;
    servicePostalCode: string;
    serviceStreet: string;
    serviceNumber: string;
    serviceComplement?: string;
    serviceDistrict: string;
    serviceCity: string;
    serviceState: string;
    serviceCountry: string;
    manualAdjustment: number;
    notes?: string;
    items: BudgetServiceItemInput[];
  },
) {
  await bootstrapRbac();
  const current = await getBudgetById(budgetId);

  if (!current) {
    throw new Error("Budget not found.");
  }

  if (current.status !== "pending") {
    throw new Error("Only pending budgets can be edited.");
  }

  assertServiceDatesNotInPast(input.items);
  const serviceTypeMap = await assertBudgetRelationsExist(input);
  const primaryItem = getPrimaryBudgetItem(input.items);
  const subtotalValue = calculateBudgetSubtotal(input.items);
  const totalValue = calculateBudgetTotal(subtotalValue, input.manualAdjustment);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE budgets
        SET client_id = $2,
            equipment_id = $3,
            service_type_id = $4,
            operator_id = $5,
            service_description = $6,
            service_date = $7,
            start_time = $8,
            end_time = $9,
            service_postal_code = $10,
            service_street = $11,
            service_number = $12,
            service_complement = $13,
            service_district = $14,
            service_city = $15,
            service_state = $16,
            service_country = $17,
            initial_value = $18,
            manual_adjustment = $19,
            subtotal_value = $20,
            total_value = $21,
            notes = $22,
            updated_at = now()
        WHERE id = $1
      `,
      [
        budgetId,
        input.clientId,
        primaryItem.equipmentId,
        primaryItem.serviceTypeId,
        primaryItem.operatorId,
        primaryItem.serviceDescription.trim(),
        primaryItem.serviceDate,
        primaryItem.startTime,
        primaryItem.endTime,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        primaryItem.initialValue,
        input.manualAdjustment ?? 0,
        subtotalValue,
        totalValue,
        input.notes?.trim() || null,
      ],
    );
    await replaceBudgetItems(client, budgetId, input.items, serviceTypeMap);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBudgetStatus(
  budgetId: string,
  status: BudgetTransitionStatus,
  reason?: string,
  actor?: StatusActorInput | null,
) {
  await bootstrapRbac();
  const current = await getBudgetById(budgetId);

  if (!current) {
    throw new Error("Budget not found.");
  }

  const isPendingTransition = current.status === "pending" && (status === "approved" || status === "cancelled");
  const isCancelledRevert = current.status === "cancelled" && status === "pending";
  const isApprovedRevert = current.status === "approved" && status === "pending";

  if (!isPendingTransition && !isCancelledRevert && !isApprovedRevert) {
    throw new Error("This budget status transition is not allowed.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (isApprovedRevert) {
      const linkedServiceOrderResult = await client.query<{ id: string; status: string }>(
        `
          SELECT id, status
          FROM service_orders
          WHERE source_budget_id = $1
          LIMIT 1
        `,
        [budgetId],
      );

      const linkedServiceOrder = linkedServiceOrderResult.rows[0];

      if (!linkedServiceOrder) {
        throw new Error("Approved budget cannot be reverted because no linked service order was found.");
      }

      if (linkedServiceOrder.status !== "pending") {
        throw new Error("Approved budget can only be reverted when the linked service order is pending.");
      }

      await client.query(
        `
          DELETE FROM service_orders
          WHERE id = $1
        `,
        [linkedServiceOrder.id],
      );
    }

    await client.query(
      `
        UPDATE budgets
        SET status = $2,
            approved_at = CASE
              WHEN $2 = 'approved' THEN now()
              WHEN $2 = 'pending' THEN null
              ELSE approved_at
            END,
            cancelled_at = CASE
              WHEN $2 = 'cancelled' THEN now()
              WHEN $2 = 'pending' THEN null
              ELSE cancelled_at
            END,
            updated_at = now()
        WHERE id = $1
      `,
      [budgetId, status],
    );

    await insertBudgetStatusHistory(client, {
      budgetId,
      budgetNumber: current.number,
      previousStatus: current.status,
      nextStatus: status,
      reason,
      actor,
    });

    if (status === "approved") {
      await createServiceOrderFromApprovedBudget(client, {
        ...current,
        status: "approved",
      }, actor);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listServiceOrders(): Promise<ManagedServiceOrder[]> {
  await bootstrapRbac();
  const result = await pool.query<ServiceOrderRow>(
    `
      SELECT
        so.id,
        so.number,
        so.origin_type,
        so.source_budget_id,
        so.source_budget_number,
        so.status,
        so.client_id,
        so.client_name,
        so.service_postal_code,
        so.service_street,
        so.service_number,
        so.service_complement,
        so.service_district,
        so.service_city,
        so.service_state,
        so.service_country,
        COUNT(soi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', soi.id,
              'position', soi.position,
              'source_budget_item_id', soi.source_budget_item_id,
              'service_type_id', soi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', st.billing_unit,
              'equipment_id', soi.equipment_id,
              'equipment_name', e.name,
              'equipment_type_name', et.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', soi.operator_id,
              'operator_name', o.name,
              'service_description', soi.service_description,
              'service_date', soi.service_date::text,
              'planned_start_time', soi.planned_start_time::text,
              'planned_end_time', soi.planned_end_time::text,
              'actual_start_time', soi.actual_start_time::text,
              'actual_end_time', soi.actual_end_time::text,
              'quoted_value', soi.quoted_value::text,
              'notes', soi.notes,
              'created_at', soi.created_at,
              'updated_at', soi.updated_at
            )
            ORDER BY soi.position
          ) FILTER (WHERE soi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        so.notes,
        so.completed_at,
        so.cancelled_at,
        so.created_at,
        so.updated_at
      FROM service_orders so
      LEFT JOIN service_order_items soi ON soi.service_order_id = so.id
      LEFT JOIN service_types st ON st.id = soi.service_type_id
      LEFT JOIN equipment e ON e.id = soi.equipment_id
      LEFT JOIN equipment_types et ON et.id = e.type_id
      LEFT JOIN operators o ON o.id = soi.operator_id
      GROUP BY
        so.id,
        so.number,
        so.origin_type,
        so.source_budget_id,
        so.source_budget_number,
        so.status,
        so.client_id,
        so.client_name,
        so.service_postal_code,
        so.service_street,
        so.service_number,
        so.service_complement,
        so.service_district,
        so.service_city,
        so.service_state,
        so.service_country,
        so.notes,
        so.completed_at,
        so.cancelled_at,
        so.created_at,
        so.updated_at
      ORDER BY so.number DESC
    `,
  );

  return result.rows.map(mapServiceOrderRow);
}

export async function getServiceOrderById(serviceOrderId: string): Promise<ManagedServiceOrder | null> {
  await bootstrapRbac();
  const result = await pool.query<ServiceOrderRow>(
    `
      SELECT
        so.id,
        so.number,
        so.origin_type,
        so.source_budget_id,
        so.source_budget_number,
        so.status,
        so.client_id,
        so.client_name,
        so.service_postal_code,
        so.service_street,
        so.service_number,
        so.service_complement,
        so.service_district,
        so.service_city,
        so.service_state,
        so.service_country,
        COUNT(soi.id)::text AS item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', soi.id,
              'position', soi.position,
              'source_budget_item_id', soi.source_budget_item_id,
              'service_type_id', soi.service_type_id,
              'service_type_name', st.name,
              'service_type_billing_unit', st.billing_unit,
              'equipment_id', soi.equipment_id,
              'equipment_name', e.name,
              'equipment_type_name', et.name,
              'equipment_brand', e.brand,
              'equipment_model', e.model,
              'operator_id', soi.operator_id,
              'operator_name', o.name,
              'service_description', soi.service_description,
              'service_date', soi.service_date::text,
              'planned_start_time', soi.planned_start_time::text,
              'planned_end_time', soi.planned_end_time::text,
              'actual_start_time', soi.actual_start_time::text,
              'actual_end_time', soi.actual_end_time::text,
              'quoted_value', soi.quoted_value::text,
              'notes', soi.notes,
              'created_at', soi.created_at,
              'updated_at', soi.updated_at
            )
            ORDER BY soi.position
          ) FILTER (WHERE soi.id IS NOT NULL),
          '[]'::json
        )::text AS items_json,
        so.notes,
        so.completed_at,
        so.cancelled_at,
        so.created_at,
        so.updated_at
      FROM service_orders so
      LEFT JOIN service_order_items soi ON soi.service_order_id = so.id
      LEFT JOIN service_types st ON st.id = soi.service_type_id
      LEFT JOIN equipment e ON e.id = soi.equipment_id
      LEFT JOIN equipment_types et ON et.id = e.type_id
      LEFT JOIN operators o ON o.id = soi.operator_id
      WHERE so.id = $1
      GROUP BY
        so.id,
        so.number,
        so.origin_type,
        so.source_budget_id,
        so.source_budget_number,
        so.status,
        so.client_id,
        so.client_name,
        so.service_postal_code,
        so.service_street,
        so.service_number,
        so.service_complement,
        so.service_district,
        so.service_city,
        so.service_state,
        so.service_country,
        so.notes,
        so.completed_at,
        so.cancelled_at,
        so.created_at,
        so.updated_at
    `,
    [serviceOrderId],
  );

  const row = result.rows[0];
  return row ? mapServiceOrderRow(row) : null;
}

export async function listServiceOrderStatusHistory(serviceOrderId: string): Promise<ManagedServiceOrderStatusHistory[]> {
  await bootstrapRbac();
  const result = await pool.query<ServiceOrderStatusHistoryRow>(
    `
      SELECT
        id,
        service_order_id,
        service_order_number,
        previous_status,
        next_status,
        reason,
        actor_user_id,
        actor_name_snapshot,
        actor_email_snapshot,
        created_at
      FROM service_order_status_history
      WHERE service_order_id = $1
      ORDER BY created_at DESC
    `,
    [serviceOrderId],
  );

  return result.rows.map(mapServiceOrderStatusHistoryRow);
}

export async function createServiceOrder(input: {
  originType: "manual" | "budget";
  sourceBudgetId?: string;
  clientId: string;
  servicePostalCode: string;
  serviceStreet: string;
  serviceNumber: string;
  serviceComplement?: string;
  serviceDistrict: string;
  serviceCity: string;
  serviceState: string;
  serviceCountry: string;
  notes?: string;
  items: ServiceOrderItemInput[];
}, actor?: StatusActorInput | null) {
  await bootstrapRbac();
  const relationData = await assertServiceOrderRelationsExist(input);

  if (input.originType === "budget") {
    assertServiceDatesNotInPast(input.items);
  }

  const id = randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE service_orders IN EXCLUSIVE MODE");

    const sequenceResult = await client.query<{ max_sequence: string }>(
      `
        SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM 4) AS integer)), 0)::text AS max_sequence
        FROM service_orders
      `,
    );

    const nextSequence = Number(sequenceResult.rows[0]?.max_sequence ?? "0") + 1;
    const number = formatServiceOrderNumber(nextSequence);

    await client.query(
      `
        INSERT INTO service_orders (
          id,
          number,
          origin_type,
          source_budget_id,
          source_budget_number,
          status,
          client_id,
          client_name,
          service_postal_code,
          service_street,
          service_number,
          service_complement,
          service_district,
          service_city,
          service_state,
          service_country,
          notes
        )
        VALUES (
          $1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `,
      [
        id,
        number,
        input.originType,
        input.sourceBudgetId ?? null,
        relationData.sourceBudgetNumber,
        input.clientId,
        relationData.clientName,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        input.notes?.trim() || null,
      ],
    );

    await replaceServiceOrderItems(client, id, input.items, relationData.serviceTypeMap);
    await insertServiceOrderStatusHistory(client, {
      serviceOrderId: id,
      serviceOrderNumber: number,
      previousStatus: null,
      nextStatus: "pending",
      actor,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return id;
}

export async function updateServiceOrder(
  serviceOrderId: string,
  input: {
    originType: "manual" | "budget";
    sourceBudgetId?: string;
    clientId: string;
    servicePostalCode: string;
    serviceStreet: string;
    serviceNumber: string;
    serviceComplement?: string;
    serviceDistrict: string;
    serviceCity: string;
    serviceState: string;
    serviceCountry: string;
    notes?: string;
    items: ServiceOrderItemInput[];
  },
) {
  await bootstrapRbac();
  const current = await getServiceOrderById(serviceOrderId);

  if (!current) {
    throw new Error("Service order not found.");
  }

  if (current.status === "completed" || current.status === "cancelled") {
    throw new Error("Completed or cancelled service orders cannot be edited.");
  }

  const relationData = await assertServiceOrderRelationsExist(input);

  if (input.originType === "budget") {
    assertServiceDatesNotInPast(input.items);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE service_orders
        SET origin_type = $2,
            source_budget_id = $3,
            source_budget_number = $4,
            client_id = $5,
            client_name = $6,
            service_postal_code = $7,
            service_street = $8,
            service_number = $9,
            service_complement = $10,
            service_district = $11,
            service_city = $12,
            service_state = $13,
            service_country = $14,
            notes = $15,
            updated_at = now()
        WHERE id = $1
      `,
      [
        serviceOrderId,
        input.originType,
        input.sourceBudgetId ?? null,
        relationData.sourceBudgetNumber,
        input.clientId,
        relationData.clientName,
        input.servicePostalCode,
        input.serviceStreet.trim(),
        input.serviceNumber.trim(),
        input.serviceComplement?.trim() || null,
        input.serviceDistrict.trim(),
        input.serviceCity.trim(),
        input.serviceState.trim(),
        input.serviceCountry.trim() || "Brasil",
        input.notes?.trim() || null,
      ],
    );

    await replaceServiceOrderItems(client, serviceOrderId, input.items, relationData.serviceTypeMap);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateServiceOrderStatus(
  serviceOrderId: string,
  status: ServiceOrderTransitionStatus,
  reason?: string,
  actor?: StatusActorInput | null,
) {
  await bootstrapRbac();
  const current = await getServiceOrderById(serviceOrderId);

  if (!current) {
    throw new Error("Service order not found.");
  }

  const validTransitions = new Set([
    "pending:scheduled",
    "pending:cancelled",
    "scheduled:in_progress",
    "scheduled:cancelled",
    "in_progress:completed",
    "completed:pending",
    "cancelled:pending",
  ]);

  if (!validTransitions.has(`${current.status}:${status}`)) {
    throw new Error("This service order status transition is not allowed.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE service_orders
        SET status = $2,
            completed_at = CASE
              WHEN $2 = 'completed' THEN now()
              WHEN $2 = 'pending' THEN null
              ELSE completed_at
            END,
            cancelled_at = CASE
              WHEN $2 = 'cancelled' THEN now()
              WHEN $2 = 'pending' THEN null
              ELSE cancelled_at
            END,
            updated_at = now()
        WHERE id = $1
      `,
      [serviceOrderId, status],
    );

    await insertServiceOrderStatusHistory(client, {
      serviceOrderId,
      serviceOrderNumber: current.number,
      previousStatus: current.status,
      nextStatus: status,
      reason,
      actor,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRolesWithDetails(): Promise<RoleWithDetails[]> {
  await bootstrapRbac();
  const rolesResult = await pool.query<RoleRow>(
    `
      SELECT id, name, slug, description, is_system
      FROM roles
      ORDER BY is_system DESC, name ASC
    `,
  );

  const permissionResult = await pool.query<{ role_id: string; key: PermissionKey }>(
    `
      SELECT rp.role_id, p.key
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
    `,
  );

  const userCountResult = await pool.query<{ role_id: string; total: string }>(
    `
      SELECT role_id, COUNT(*)::text AS total
      FROM user_roles
      GROUP BY role_id
    `,
  );

  const permissionsByRole = new Map<string, PermissionKey[]>();
  for (const row of permissionResult.rows) {
    const current = permissionsByRole.get(row.role_id) ?? [];
    current.push(row.key);
    permissionsByRole.set(row.role_id, current);
  }

  const usersCountByRole = new Map(userCountResult.rows.map((row) => [row.role_id, Number(row.total)]));

  return rolesResult.rows.map((row) => {
    const role = mapRoleRow(row);
    const permissions = [...(permissionsByRole.get(role.id) ?? [])].sort();

    return {
      ...role,
      permissions,
      permissionsCount: permissions.length,
      usersCount: usersCountByRole.get(role.id) ?? 0,
    };
  });
}

export async function createRole(input: {
  name: string;
  permissionKeys: PermissionKey[];
}) {
  await bootstrapRbac();
  const name = normalizeRoleName(input.name);
  const existingRoleId = await findConflictingRoleByName(name);
  if (existingRoleId) {
    throw new Error("A role with this name already exists.");
  }
  const slug = await generateUniqueRoleSlug(name);

  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO roles (id, name, slug, description, is_system)
      VALUES ($1, $2, $3, $4, false)
    `,
    [id, name, slug, null],
  );

  await syncRolePermissions(id, input.permissionKeys);

  return id;
}

export async function updateRole(
  roleId: string,
  input: {
    name: string;
    permissionKeys: PermissionKey[];
  },
) {
  await bootstrapRbac();
  const current = await getRoleById(roleId);

  if (!current) {
    throw new Error("Role not found.");
  }

  if (current.isSystem) {
    throw new Error("System roles cannot be edited.");
  }
  const name = normalizeRoleName(input.name);
  const existingRoleId = await findConflictingRoleByName(name, roleId);
  if (existingRoleId) {
    throw new Error("A role with this name already exists.");
  }
  const slug = await generateUniqueRoleSlug(name, roleId);

  await pool.query(
    `
      UPDATE roles
      SET name = $2,
          slug = $3,
          description = $4,
          updated_at = now()
      WHERE id = $1
    `,
    [roleId, name, slug, null],
  );

  await syncRolePermissions(roleId, input.permissionKeys);
}

export async function deleteRole(roleId: string) {
  await bootstrapRbac();
  const current = await getRoleById(roleId);

  if (!current) {
    throw new Error("Role not found.");
  }

  if (current.isSystem) {
    throw new Error("System roles cannot be deleted.");
  }

  const assignedUsers = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM user_roles WHERE role_id = $1`,
    [roleId],
  );

  if (Number(assignedUsers.rows[0]?.total ?? "0") > 0) {
    throw new Error("Remove this role from users before deleting it.");
  }

  await pool.query(`DELETE FROM roles WHERE id = $1`, [roleId]);
}

export async function getRoleById(roleId: string) {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE id = $1 LIMIT 1`,
    [roleId],
  );

  const row = result.rows[0];
  return row ? mapRoleRow(row) : null;
}

export async function getUserRoleAssignments(userId: string, legacyRole?: string | null): Promise<UserRoleSummary[]> {
  await bootstrapRbac();
  const result = await pool.query<RoleRow>(
    `
      SELECT r.id, r.name, r.slug, r.description, r.is_system
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.is_system DESC, r.name ASC
    `,
    [userId],
  );

  if (result.rows.length > 0) {
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isSystem: row.is_system,
    }));
  }

  const fallbackRole = normalizeLegacyRole(legacyRole).includes(SYSTEM_ROLE_SLUGS.admin)
    ? SYSTEM_ROLE_SLUGS.admin
    : SYSTEM_ROLE_SLUGS.user;

  await assignRoleToUser(userId, fallbackRole);
  await ensureLegacyRoleSync(userId);
  return getUserRoleAssignments(userId);
}

export async function getUserAccessState(userId: string): Promise<UserAccessState | null> {
  await bootstrapRbac();
  const result = await pool.query<UserAccessRow>(
    `
      SELECT uas.user_id, uas.is_active, uas.reason
      FROM "user" u
      LEFT JOIN user_access_status uas ON uas.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  const row = result.rows[0];
  return row ? normalizeUserAccessState(row) : null;
}

export async function getUserAccessStateByEmail(email: string): Promise<UserAccessState | null> {
  await bootstrapRbac();
  const result = await pool.query<UserAccessRow>(
    `
      SELECT uas.user_id, uas.is_active, uas.reason
      FROM "user" u
      LEFT JOIN user_access_status uas ON uas.user_id = u.id
      WHERE lower(u.email) = lower($1)
      LIMIT 1
    `,
    [email.trim()],
  );

  const row = result.rows[0];
  return row ? normalizeUserAccessState(row) : null;
}

export async function getUserAccessStateBatch(userIds: string[]): Promise<Map<string, UserAccessState>> {
  await bootstrapRbac();

  if (userIds.length === 0) {
    return new Map();
  }

  const uniqueUserIds = [...new Set(userIds)];
  const result = await pool.query<UserAccessRow>(
    `
      SELECT user_id, is_active, reason
      FROM user_access_status
      WHERE user_id = ANY($1::text[])
    `,
    [uniqueUserIds],
  );

  return new Map(result.rows.map((row) => [row.user_id, normalizeUserAccessState(row)]));
}

export async function setUserAccessState(userId: string, isActive: boolean, reason?: string | null) {
  await bootstrapRbac();
  await pool.query(
    `
      INSERT INTO user_access_status (user_id, is_active, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE
      SET is_active = EXCLUDED.is_active,
          reason = EXCLUDED.reason,
          updated_at = now()
    `,
    [userId, isActive, isActive ? null : reason?.trim() || "Marked as inactive by administrator"],
  );
}

export async function getUserRoleAssignmentsBatch(
  users: Array<{ id: string; legacyRole?: string | null }>,
): Promise<Map<string, UserRoleSummary[]>> {
  await bootstrapRbac();

  if (users.length === 0) {
    return new Map();
  }

  const userIds = [...new Set(users.map((user) => user.id))];
  const result = await pool.query<RoleRow & { user_id: string }>(
    `
      SELECT ur.user_id, r.id, r.name, r.slug, r.description, r.is_system
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ANY($1::text[])
      ORDER BY r.is_system DESC, r.name ASC
    `,
    [userIds],
  );

  const rolesByUser = new Map<string, UserRoleSummary[]>();

  for (const row of result.rows) {
    const current = rolesByUser.get(row.user_id) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isSystem: row.is_system,
    });
    rolesByUser.set(row.user_id, current);
  }

  const fallbackRolesResult = await pool.query<RoleRow>(
    `SELECT id, name, slug, description, is_system FROM roles WHERE slug = ANY($1::text[])`,
    [[SYSTEM_ROLE_SLUGS.admin, SYSTEM_ROLE_SLUGS.user]],
  );

  const fallbackBySlug = new Map(fallbackRolesResult.rows.map((row) => [row.slug, row]));

  for (const user of users) {
    if (rolesByUser.has(user.id)) {
      continue;
    }

    const fallbackSlug = normalizeLegacyRole(user.legacyRole).includes(SYSTEM_ROLE_SLUGS.admin)
      ? SYSTEM_ROLE_SLUGS.admin
      : SYSTEM_ROLE_SLUGS.user;
    const fallbackRole = fallbackBySlug.get(fallbackSlug);

    if (!fallbackRole) {
      rolesByUser.set(user.id, []);
      continue;
    }

    rolesByUser.set(user.id, [{
      id: fallbackRole.id,
      name: fallbackRole.name,
      slug: fallbackRole.slug,
      isSystem: fallbackRole.is_system,
    }]);
  }

  return rolesByUser;
}

export async function getUserRoleSlugs(userId: string, legacyRole?: string | null) {
  const roles = await getUserRoleAssignments(userId, legacyRole);
  return roles.map((role) => role.slug);
}

export async function getUserPermissionKeys(userId: string, legacyRole?: string | null): Promise<PermissionKey[]> {
  const roles = await getUserRoleAssignments(userId, legacyRole);

  if (roles.some((role) => role.slug === SYSTEM_ROLE_SLUGS.admin)) {
    return PERMISSION_CATALOG.map((permission) => permission.key);
  }

  const result = await pool.query<PermissionRow>(
    `
      SELECT DISTINCT p.key
      FROM user_roles ur
      INNER JOIN role_permissions rp ON rp.role_id = ur.role_id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1
      ORDER BY p.key ASC
    `,
    [userId],
  );

  return result.rows.map((row) => row.key);
}

async function countAdminUsers() {
  const adminRole = await getRoleBySlug(SYSTEM_ROLE_SLUGS.admin);

  if (!adminRole) {
    return 0;
  }

  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM user_roles WHERE role_id = $1`,
    [adminRole.id],
  );

  return Number(result.rows[0]?.total ?? "0");
}

export async function assignRolesToUser(userId: string, roleIdsOrSlugs: string[]) {
  await bootstrapRbac();
  const selectedRoles = roleIdsOrSlugs.length > 0 ? [...new Set(roleIdsOrSlugs)] : [SYSTEM_ROLE_SLUGS.user];

  const resolvedRoles: RoleRecord[] = [];
  for (const value of selectedRoles) {
    const byId = await getRoleById(value);
    const role = byId ?? await getRoleBySlug(value);

    if (!role) {
      throw new Error("One or more selected roles do not exist.");
    }

    resolvedRoles.push(role);
  }

  const currentRoleSlugs = await listDirectUserRoleSlugs(userId);
  const nextRoleSlugs = resolvedRoles.map((role) => role.slug);
  const isRemovingAdmin = currentRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) && !nextRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin);

  if (isRemovingAdmin && await countAdminUsers() <= 1) {
    throw new Error("At least one admin user must remain assigned to the admin role.");
  }

  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  for (const role of resolvedRoles) {
    await pool.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, role.id],
    );
  }

  await ensureLegacyRoleSync(userId);
}

export async function deleteUserRoleAssignments(userId: string) {
  await bootstrapRbac();
  const currentRoleSlugs = await listDirectUserRoleSlugs(userId);

  if (currentRoleSlugs.includes(SYSTEM_ROLE_SLUGS.admin) && await countAdminUsers() <= 1) {
    throw new Error("You cannot remove the last admin user.");
  }

  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
}

export async function getCurrentSessionState(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  await bootstrapRbac({
    id: session.user.id,
    role: session.user.role,
  });

  const accessState = await getUserAccessState(session.user.id);
  const isBanned = Boolean(session.user.banned);

  if (isBanned || accessState?.isActive === false) {
    return {
      session,
      roles: [],
      permissions: [],
      accessState: {
        isActive: false,
        reason: isBanned
          ? session.user.banReason || "Your account is banned."
          : accessState?.reason || "Your account is inactive.",
      },
    };
  }

  const roles = await getUserRoleAssignments(session.user.id, session.user.role);
  const permissions = await getUserPermissionKeys(session.user.id, session.user.role);

  return {
    session,
    roles,
    permissions,
    accessState: {
      isActive: true,
      reason: null,
    },
  };
}

export async function requirePermission(request: Request, permission: PermissionKey) {
  const state = await getCurrentSessionState(request);
  const path = new URL(request.url).pathname;

  if (!state) {
    logRequestSecurityEvent("authz.unauthorized", request, {
      level: "warn",
      details: {
        permission,
        path,
      },
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!state.accessState.isActive) {
    logRequestSecurityEvent("authz.inactive_denied", request, {
      level: "warn",
      userId: state.session.user.id,
      details: {
        permission,
        path,
        reason: state.accessState.reason,
      },
    });
    return NextResponse.json(
      { error: state.accessState.reason || "Your account is inactive." },
      { status: 403 },
    );
  }

  if (!state.permissions.includes(permission)) {
    logRequestSecurityEvent("authz.permission_denied", request, {
      level: "warn",
      userId: state.session.user.id,
      details: {
        permission,
        path,
      },
    });
    return NextResponse.json({ error: "You do not have permission to perform this action." }, { status: 403 });
  }

  return state;
}
