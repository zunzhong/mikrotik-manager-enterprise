import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsCertificate,
  RouterOsFile,
  RouterOsLogEntry,
  RouterOsNetwatchEntry,
  RouterOsPackage,
  RouterOsScheduler,
  RouterOsScript,
  RouterOsUser,
  RouterOsUserGroup,
} from '../models/system-management.js';

class UserApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsUser[]> {
    return this.runner.print('/user/print') as Promise<RouterOsUser[]>;
  }

  public async add(input: {
    name: string;
    password: string;
    group?: string;
    address?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/user/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/user/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/user/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/user/disable', { attributes: { numbers: id } });
  }
}

class UserGroupApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsUserGroup[]> {
    return this.runner.print('/user/group/print') as Promise<RouterOsUserGroup[]>;
  }

  public async add(input: {
    name: string;
    policy: string;
    skin?: string;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/user/group/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/user/group/remove', id);
  }
}

class ScriptApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsScript[]> {
    return this.runner.print('/system/script/print') as Promise<RouterOsScript[]>;
  }

  public async add(input: {
    name: string;
    source: string;
    policy?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/system/script/add', input);
  }

  public async run(id: string): Promise<void> {
    await this.runner.run('/system/script/run', { attributes: { number: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/system/script/remove', id);
  }
}

class SchedulerApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsScheduler[]> {
    return this.runner.print('/system/scheduler/print') as Promise<RouterOsScheduler[]>;
  }

  public async add(input: {
    name: string;
    onEvent: string;
    interval?: string;
    startDate?: string;
    startTime?: string;
    policy?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/system/scheduler/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/system/scheduler/remove', id);
  }
}

class FileApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsFile[]> {
    return this.runner.print('/file/print') as Promise<RouterOsFile[]>;
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/file/remove', id);
  }
}

class BackupApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async save(name: string): Promise<void> {
    await this.runner.run('/system/backup/save', { attributes: { name } });
  }

  public async cloudUpload(): Promise<void> {
    await this.runner.run('/system/backup/cloud/upload-file');
  }
}

class ExportApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async compact(file?: string): Promise<void> {
    await this.runner.run('/export', { attributes: file ? { file } : {} });
  }
}

class PackageApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsPackage[]> {
    return this.runner.print('/system/package/print') as Promise<RouterOsPackage[]>;
  }

  public async updateCheck(): Promise<void> {
    await this.runner.run('/system/package/update/check-for-updates');
  }
}

class CertificateApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsCertificate[]> {
    return this.runner.print('/certificate/print') as Promise<RouterOsCertificate[]>;
  }
}

class LogApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsLogEntry[]> {
    return this.runner.print('/log/print') as Promise<RouterOsLogEntry[]>;
  }
}

class NetwatchApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsNetwatchEntry[]> {
    return this.runner.print('/tool/netwatch/print') as Promise<RouterOsNetwatchEntry[]>;
  }

  public async add(input: {
    host: string;
    interval?: string;
    timeout?: string;
    upScript?: string;
    downScript?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/tool/netwatch/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/tool/netwatch/remove', id);
  }
}

export class SystemManagementApi {
  public readonly user: UserApi;
  public readonly group: UserGroupApi;
  public readonly script: ScriptApi;
  public readonly scheduler: SchedulerApi;
  public readonly file: FileApi;
  public readonly backup: BackupApi;
  public readonly exportConfig: ExportApi;
  public readonly package: PackageApi;
  public readonly certificate: CertificateApi;
  public readonly log: LogApi;
  public readonly netwatch: NetwatchApi;

  public constructor(runner: CommandRunner) {
    this.user = new UserApi(runner);
    this.group = new UserGroupApi(runner);
    this.script = new ScriptApi(runner);
    this.scheduler = new SchedulerApi(runner);
    this.file = new FileApi(runner);
    this.backup = new BackupApi(runner);
    this.exportConfig = new ExportApi(runner);
    this.package = new PackageApi(runner);
    this.certificate = new CertificateApi(runner);
    this.log = new LogApi(runner);
    this.netwatch = new NetwatchApi(runner);
  }
}
