export interface RouterOsSimpleQueue {
  id?: string;
  name?: string;
  target?: string;
  dst?: string;
  parent?: string;
  packetMarks?: string;
  priority?: string;
  queue?: string;
  limitAt?: string;
  maxLimit?: string;
  burstLimit?: string;
  burstThreshold?: string;
  burstTime?: string;
  disabled?: string;
  dynamic?: string;
  invalid?: string;
  comment?: string;
}

export interface RouterOsQueueTree {
  id?: string;
  name?: string;
  parent?: string;
  packetMark?: string;
  priority?: string;
  queue?: string;
  limitAt?: string;
  maxLimit?: string;
  burstLimit?: string;
  burstThreshold?: string;
  burstTime?: string;
  disabled?: string;
  invalid?: string;
  comment?: string;
}

export interface RouterOsQueueType {
  id?: string;
  name?: string;
  kind?: string;
  pfifoLimit?: string;
  bfifoLimit?: string;
  pcqRate?: string;
  pcqLimit?: string;
  pcqTotalLimit?: string;
  pcqClassifier?: string;
  comment?: string;
}
