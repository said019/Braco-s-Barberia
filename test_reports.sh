#!/bin/bash

# Script para probar los 3 nuevos endpoints de reportes

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJNaWd1ZWwgVHJ1amlsbG8iLCJpYXQiOjE3NjUzMTM4MTQsImV4cCI6MTc2NTM0MjYxNH0.2HpgirnfFP7VeFienjfDTMM9XzZgTX7RD0WnEZkR6PI"

echo "================================================"
echo "TEST 1: REVENUE REPORT (Ingresos Reales)"
echo "================================================"
curl -s 'http://localhost:3000/api/admin/reports/revenue?start_date=2024-01-01&end_date=2025-12-31' \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n\n================================================"
echo "TEST 2: SERVICES PROVIDED (Servicios Prestados)"
echo "================================================"
curl -s 'http://localhost:3000/api/admin/reports/services-provided?start_date=2024-01-01&end_date=2025-12-31' \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n\n================================================"
echo "TEST 3: MEMBERSHIP ROI (ROI de Membresías)"
echo "================================================"
curl -s 'http://localhost:3000/api/admin/reports/membership-roi?start_date=2024-01-01&end_date=2025-12-31' \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool
