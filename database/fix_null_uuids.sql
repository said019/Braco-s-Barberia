-- Fix NULL UUIDs in client_memberships table
-- This script generates UUIDs for all memberships that have NULL uuid values

-- First, verify how many memberships have NULL uuids
SELECT
    COUNT(*) as total_memberships,
    COUNT(uuid) as memberships_with_uuid,
    COUNT(*) - COUNT(uuid) as memberships_missing_uuid
FROM client_memberships;

-- Show memberships with NULL uuids (if any)
SELECT
    id,
    client_id,
    membership_type_id,
    folio_number,
    uuid,
    created_at
FROM client_memberships
WHERE uuid IS NULL
ORDER BY created_at DESC;

-- Update all NULL uuids with newly generated UUIDs
UPDATE client_memberships
SET uuid = uuid_generate_v4()
WHERE uuid IS NULL;

-- Verify the fix
SELECT
    COUNT(*) as total_memberships,
    COUNT(uuid) as memberships_with_uuid,
    COUNT(*) - COUNT(uuid) as memberships_missing_uuid
FROM client_memberships;

-- Show all memberships with their UUIDs
SELECT
    cm.id,
    c.name as client_name,
    mt.name as membership_type,
    cm.folio_number,
    cm.uuid,
    cm.status,
    cm.created_at
FROM client_memberships cm
JOIN clients c ON cm.client_id = c.id
JOIN membership_types mt ON cm.membership_type_id = mt.id
ORDER BY cm.created_at DESC
LIMIT 20;
