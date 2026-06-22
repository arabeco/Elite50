with catalog_asset_updates(id, image_path, asset_path) as (
  values
    ('kit_circuit_chrome', '/assetas/avatars/uniforms/store-kit-circuit-chrome.png', '/assetas/avatars/uniforms/store-kit-circuit-chrome.png'),
    ('kit_holo_wave', '/assetas/avatars/uniforms/store-kit-holo-wave.png', '/assetas/avatars/uniforms/store-kit-holo-wave.png'),
    ('kit_carbon_grid', '/assetas/avatars/uniforms/store-kit-carbon-grid.png', '/assetas/avatars/uniforms/store-kit-carbon-grid.png'),
    ('kit_pulse_white', '/assetas/avatars/uniforms/store-kit-pulse-white.png', '/assetas/avatars/uniforms/store-kit-pulse-white.png'),
    ('kit_neon_flux', '/assetas/avatars/uniforms/store-kit-neon-flux.png', '/assetas/avatars/uniforms/store-kit-neon-flux.png'),
    ('logo_quantum_vault', '/assetas/avatars/logos/store-logo-quantum-vault.png', '/assetas/avatars/logos/store-logo-quantum-vault.png'),
    ('logo_holo_tiger', '/assetas/avatars/logos/store-logo-holo-tiger.png', '/assetas/avatars/logos/store-logo-holo-tiger.png'),
    ('logo_blackout_crown', '/assetas/avatars/logos/store-logo-blackout-crown.png', '/assetas/avatars/logos/store-logo-blackout-crown.png'),
    ('logo_pulse_hex', '/assetas/avatars/logos/store-logo-pulse-hex.png', '/assetas/avatars/logos/store-logo-pulse-hex.png'),
    ('logo_solar_wire', '/assetas/avatars/logos/store-logo-solar-wire.png', '/assetas/avatars/logos/store-logo-solar-wire.png')
)
update public.catalog_items item
set image_path = catalog_asset_updates.image_path,
    asset_path = catalog_asset_updates.asset_path,
    payload = case
      when item.category = 'LOGO' then jsonb_set(
        jsonb_set(
          coalesce(item.payload, '{}'::jsonb),
          '{logoPreview,symbolId}',
          to_jsonb('asset:' || catalog_asset_updates.asset_path)
        ),
        '{logoPreview,assetPath}',
        to_jsonb(catalog_asset_updates.asset_path)
      )
      else coalesce(item.payload, '{}'::jsonb)
    end
from catalog_asset_updates
where item.id = catalog_asset_updates.id;
