import { HttpError } from '../../../errors/http-error.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../infrastructure/device.repository.js';
import type { CreateDeviceInput, UpdateDeviceInput } from '../presentation/device.schemas.js';

export class DeviceService {
  public async create(input: CreateDeviceInput) {
    const device = await deviceRepository.create({
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username,
      passwordEncrypted: encryptionService.encrypt(input.password),
      useTls: input.useTls,
      loginMode: input.loginMode,
      groupId: input.groupId,
      tags: input.tags,
    });

    return this.toSafeDevice(device);
  }

  public async list() {
    const devices = await deviceRepository.findMany();
    return devices.map((device) => this.toSafeDevice(device));
  }

  public async get(id: string) {
    const device = await deviceRepository.findById(id);

    if (!device) {
      throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }

    return this.toSafeDevice(device);
  }

  public async update(id: string, input: UpdateDeviceInput) {
    await this.get(id);

    const { password, ...rest } = input;

    const device = await deviceRepository.update(id, {
      ...rest,
      passwordEncrypted: password !== undefined ? encryptionService.encrypt(password) : undefined,
    });

    return this.toSafeDevice(device);
  }

  public async delete(id: string) {
    await this.get(id);
    await deviceRepository.delete(id);

    return { deleted: true, id };
  }

  private toSafeDevice(device: any) {
    const { passwordEncrypted: _passwordEncrypted, ...safe } = device;
    return safe;
  }
}

export const deviceService = new DeviceService();
