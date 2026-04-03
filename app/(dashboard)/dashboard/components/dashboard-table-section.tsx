"use client"

import { DataTable } from "./data-table"

import data from "../data/data.json"
import pastPerformanceData from "../data/past-performance-data.json"
import keyPersonnelData from "../data/key-personnel-data.json"
import focusDocumentsData from "../data/focus-documents-data.json"

export function DashboardTableSection() {
  return (
    <DataTable
      data={data}
      pastPerformanceData={pastPerformanceData}
      keyPersonnelData={keyPersonnelData}
      focusDocumentsData={focusDocumentsData}
    />
  )
}
