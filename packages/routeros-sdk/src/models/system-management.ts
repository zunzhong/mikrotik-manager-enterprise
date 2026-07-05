export interface RouterOsUser {
  id?: string;
  name?: string;
  group?: string;
  address?: string;
  lastLoggedIn?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsUserGroup {
  id?: string;
  name?: string;
  policy?: string;
  skin?: string;
  comment?: string;
}

export interface RouterOsScript {
  id?: string;
  name?: string;
  owner?: string;
  policy?: string;
  source?: string;
  runCount?: string;
  lastStarted?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsScheduler {
  id?: string;
  name?: string;
  startDate?: string;
  startTime?: string;
  interval?: string;
  onEvent?: string;
  owner?: string;
  policy?: string;
  runCount?: string;
  nextRun?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsFile {
  id?: string;
  name?: string;
  type?: string;
  size?: string;
  creationTime?: string;
  contents?: string;
}

export interface RouterOsPackage {
  id?: string;
  name?: string;
  version?: string;
  buildTime?: string;
  scheduled?: string;
  disabled?: string;
}

export interface RouterOsCertificate {
  id?: string;
  name?: string;
  commonName?: string;
  keySize?: string;
  daysValid?: string;
  trusted?: string;
  revoked?: string;
  expired?: string;
  fingerprint?: string;
}

export interface RouterOsLogEntry {
  id?: string;
  time?: string;
  topics?: string;
  message?: string;
}

export interface RouterOsNetwatchEntry {
  id?: string;
  host?: string;
  type?: string;
  interval?: string;
  timeout?: string;
  status?: string;
  since?: string;
  upScript?: string;
  downScript?: string;
  disabled?: string;
  comment?: string;
}
