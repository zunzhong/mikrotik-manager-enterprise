import { alertRules } from '../domain/alert-rules.js';
import { alertRepository, type CreateAlertInput } from '../infrastructure/alert.repository.js';

export class AlertService {
  public listRules() {
    return alertRules;
  }

  public list() {
    return alertRepository.list();
  }

  public create(input: CreateAlertInput) {
    return alertRepository.create(input);
  }

  public acknowledge(id: string) {
    return alertRepository.acknowledge(id);
  }
}

export const alertService = new AlertService();
