import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../auth/roles.enum';
import { ReportStatus } from './report.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @Roles(UserRole.CITIZEN, UserRole.OFFICER, UserRole.ADMIN)
  async create(@Body() createReportDto: CreateReportDto, @Request() req: any) {
    console.log(`[AIS Security] Reached Method: POST /reports (create)`);
    return this.reportsService.create({
      ...createReportDto,
      reporter_id: req.user.id,
    });
  }

  @Get()
  @Roles(UserRole.OFFICER, UserRole.ADMIN)
  async findAll() {
    console.log(`[AIS Security] Reached Method: GET /reports (findAll)`);
    return this.reportsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OFFICER, UserRole.ADMIN)
  async updateReport(
    @Param('id') id: string,
    @Body() updates: Partial<CreateReportDto | any>
  ) {
    console.log(`[AIS Security] Reached Method: PATCH /reports/${id} (updateReport)`);
    return this.reportsService.updateReport(id, updates);
  }

  @Patch(':id/status')
  @Roles(UserRole.OFFICER, UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ReportStatus
  ) {
    return this.reportsService.updateStatus(id, status);
  }
}
