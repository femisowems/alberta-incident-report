import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Report, ReportStatus } from './report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private eventEmitter: EventEmitter2
  ) {}

  async create(reportData: Partial<Report>): Promise<Report> {
    const report = this.reportRepository.create({
      ...reportData,
      status: ReportStatus.SUBMITTED,
    });
    
    const savedReport = await this.reportRepository.save(report);
    
    // Emit event for workflow engine
    this.eventEmitter.emit('report.created', savedReport);
    
    return savedReport;
  }

  async findAll(): Promise<Report[]> {
    return this.reportRepository.find({
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Report> {
    const report = await this.reportRepository.findOneBy({ id });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return report;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    const report = await this.findOne(id);
    const oldStatus = report.status;
    
    const updated = await this.reportRepository.save({
      ...report,
      ...updates
    });

    if (updates.status && updates.status !== oldStatus) {
      this.eventEmitter.emit('report.status_updated', { report: updated, oldStatus });
    }

    return updated;
  }

  async updateStatus(id: string, status: ReportStatus): Promise<Report> {
    return this.updateReport(id, { status });
  }
}
