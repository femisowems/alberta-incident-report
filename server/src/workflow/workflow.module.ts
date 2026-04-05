import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
