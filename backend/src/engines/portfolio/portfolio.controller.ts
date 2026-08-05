import { Controller, Get, Post, Patch, Delete, Param, Body, HttpException, HttpStatus, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { TradeImportService } from './trade-import.service';
import { AuthGuard } from '../auth/auth.controller';

@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly tradeImportService: TradeImportService,
  ) {}

   @Get()
  async getPortfolio() {
    return this.portfolioService.getPortfolio();
  }

  @Get('dashboard')
  async getDashboard() {
    return this.portfolioService.getDashboard();
  }

  @Post('position')
  async addPosition(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can create positions.');
    }
    if (!body.symbol || !body.buyPrice || !body.quantity) {
      throw new HttpException('Symbol, buyPrice, and quantity are required fields.', HttpStatus.BAD_REQUEST);
    }
    return this.portfolioService.addPosition(body);
  }

  @Patch('position/:id')
  async editPosition(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can modify positions.');
    }
    return this.portfolioService.editPosition(id, body);
  }

  @Patch('position/:id/close')
  async closePosition(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can close positions.');
    }
    return this.portfolioService.closePosition(
      id,
      body.sellingPrice,
      body.brokerCharges,
      body.closedAt || body.sellingDate,
      body.notes,
      body.exitReason,
    );
  }

  @Delete('position/:id')
  async deletePosition(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can delete positions.');
    }
    return this.portfolioService.deletePosition(id);
  }


  @Post('bulk-delete')
  async bulkDelete(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can perform bulk deletions.');
    }
    if (!Array.isArray(body.ids)) {
      throw new HttpException('Array of ids is required.', HttpStatus.BAD_REQUEST);
    }
    return this.portfolioService.bulkDelete(body.ids);
  }

  @Post('bulk-update')
  async bulkUpdate(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can perform bulk updates.');
    }
    if (!Array.isArray(body.positions)) {
      throw new HttpException('Array of positions is required.', HttpStatus.BAD_REQUEST);
    }
    return this.portfolioService.bulkUpdate(body.positions);
  }

  @Post('bulk-import')
  async bulkImport(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'OWNER') {
      throw new ForbiddenException('Only platform owners can perform bulk imports.');
    }
    if (!body.csvData) {
      throw new HttpException('csvData string is required.', HttpStatus.BAD_REQUEST);
    }
    try {
      const rawRows = this.tradeImportService.parseCsv(body.csvData);
      const { valid, invalid } = this.tradeImportService.validateRows(rawRows);
      const { ready, duplicates } = await this.tradeImportService.detectDuplicates(valid);
      
      let importedRecords = [];
      if (body.dryRun !== true) {
        importedRecords = await this.tradeImportService.importTrades(ready);
      }
      
      return this.tradeImportService.generateReport(importedRecords, duplicates, invalid);
    } catch (err: any) {
      throw new HttpException(err.message || 'Bulk import failed.', HttpStatus.BAD_REQUEST);
    }
  }
}
