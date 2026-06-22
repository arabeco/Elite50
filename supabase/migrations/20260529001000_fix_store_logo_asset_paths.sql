with logo_updates(id, image_path, asset_path) as (
  values
    ('logo_quantum_vault', '/assetas/avatars/logos/store-logo-quantum-vault.png', '/assetas/avatars/logos/store-logo-quantum-vault.png'),
    ('logo_holo_tiger', '/assetas/avatars/logos/store-logo-holo-tiger.png', '/assetas/avatars/logos/store-logo-holo-tiger.png'),
    ('logo_blackout_crown', '/assetas/avatars/logos/store-logo-blackout-crown.png', '/assetas/avatars/logos/store-logo-blackout-crown.png'),
    ('logo_pulse_hex', '/assetas/avatars/logos/store-logo-pulse-hex.png', '/assetas/avatars/logos/store-logo-pulse-hex.png'),
    ('logo_solar_wire', '/assetas/avatars/logos/store-logo-solar-wire.png', '/assetas/avatars/logos/store-logo-solar-wire.png')
)
update public.catalog_items item
set image_path = logo_updates.image_path,
    asset_path = logo_updates.asset_path,
    payload = jsonb_set(
      jsonb_set(
        coalesce(item.payload, '{}'::jsonb),
        '{logoPreview,symbolId}',
        to_jsonb('asset:' || logo_updates.asset_path)
      ),
      '{logoPreview,assetPath}',
      to_jsonb(logo_updates.asset_path)
    )
from logo_updates
where item.id = logo_updates.id;

