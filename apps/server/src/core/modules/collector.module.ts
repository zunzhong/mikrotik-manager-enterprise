import { collectorService } from '../../modules/collector/index.js';
import type { CoreModule } from './module.types.js';

export const collectorModule: CoreModule = {
  name: 'core.collector',
  version: '0.1.0',
  description: 'Enterprise inventory collector pipeline',

  load() {
    collectorService.registerHandlers();
  },
};
