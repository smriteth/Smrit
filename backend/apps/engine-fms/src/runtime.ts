import { TraccarService } from './services/traccar.service';

let traccarServiceInstance: TraccarService | null = null;
let traccarOsmAndEndpoint = 'http://localhost:5055/';

export function setTraccarServiceInstance(instance: TraccarService) {
  traccarServiceInstance = instance;
}

export function getTraccarServiceInstance(): TraccarService {
  if (!traccarServiceInstance) {
    throw new Error('TraccarService has not been initialized');
  }
  return traccarServiceInstance;
}

export function setTraccarOsmAndEndpoint(endpoint: string) {
  traccarOsmAndEndpoint = endpoint;
}

export function getTraccarOsmAndEndpoint(): string {
  return traccarOsmAndEndpoint;
}
