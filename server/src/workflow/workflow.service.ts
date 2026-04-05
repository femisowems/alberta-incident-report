import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Report, ReportStatus } from '../reports/report.entity';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  @OnEvent('report.created')
  async handleReportCreated(report: Report) {
    this.logger.log(`Workflow triggered for report ${report.id} of type ${report.type}`);

    // Simulation of Power Automate Logic:
    // IF incident_type = "theft" THEN assign to division X (Mocked as officer_id 'officer_123')
    
    if (report.type === 'theft') {
      this.logger.log(`Auto-assigning theft report ${report.id} to specialty unit...`);
      // Update logic would go here:
      // report.status = ReportStatus.ASSIGNED;
      // report.assigned_officer_id = 'special_unit_officer_1';
    }

    if (report.type === 'abandoned_vehicle') {
      this.logger.log(`Sending automated notification to municipal towing service...`);
    }
  }

  @OnEvent('report.status_updated')
  async handleStatusUpdated(payload: { report: Report; oldStatus: string }) {
    this.logger.log(`Report ${payload.report.id} status changed from ${payload.oldStatus} to ${payload.report.status}`);
  }
}
