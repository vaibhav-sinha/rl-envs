import { Switch } from '../../components/ui/switch';
import type { AllowNoveltyConfig, CheckCatalog } from '../types';
import {
  buildNoveltyConfig,
  isNoveltyMasterOn,
  setNoveltyProperty,
} from '../novelty-helpers';
import { FieldHelp } from './FieldHelp';

export function NoveltyPanel({
  catalog,
  config,
  onChange,
}: {
  catalog: CheckCatalog;
  config: AllowNoveltyConfig | undefined;
  onChange: (next: AllowNoveltyConfig | undefined) => void;
}) {
  const masterOn = isNoveltyMasterOn(config);
  const categories = catalog.design_system.novelty_categories ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <Switch
          checked={masterOn}
          onCheckedChange={(on) => {
            if (!on) {
              onChange(undefined);
              return;
            }
            onChange(buildNoveltyConfig(catalog, true));
          }}
        />
        <FieldHelp
          label={catalog.design_system.fields.allow_novelty.label}
          description={catalog.design_system.fields.allow_novelty.description}
        />
      </div>

      {masterOn && config ? (
        <div className="space-y-3 pl-1 border-l-2 border-[#444] ml-1">
          {categories.map((cat) => (
            <section key={cat.id} className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold m-0 text-foreground">{cat.label}</p>
                <p className="text-[9px] text-muted m-0 mt-0.5">{cat.description}</p>
              </div>
              <div className="space-y-2">
                {cat.properties.map((prop) => (
                  <div key={prop.key} className="flex items-start gap-2">
                    <Switch
                      checked={!!config[cat.id]?.[prop.key as keyof (typeof config)[typeof cat.id]]}
                      onCheckedChange={(on) => {
                        onChange(setNoveltyProperty(config, cat.id, prop.key, on));
                      }}
                    />
                    <FieldHelp label={prop.label} description={prop.description} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
