import { Controller, Get, Query, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('quote')
  async getQuote(@Query('symbol') symbol: string) {
    if (!symbol) throw new HttpException('Symbol query parameter is required', HttpStatus.BAD_REQUEST);
    const quote = await this.marketService.getQuote(symbol);
    return { data: quote };
  }

  @Get('quotes')
  async getQuotes(@Query('symbols') symbols: string) {
    if (!symbols) throw new HttpException('Symbols query parameter is required', HttpStatus.BAD_REQUEST);
    const symbolList = symbols.split(',').map((s) => s.trim());
    const quotes = await this.marketService.getQuotes(symbolList);
    return { data: quotes };
  }

  @Post('subscribe')
  async subscribe(@Body('symbols') symbols: string[]) {
    if (!Array.isArray(symbols)) {
      throw new HttpException('Symbols body must be an array of ticker strings', HttpStatus.BAD_REQUEST);
    }
    await this.marketService.subscribeSymbols(symbols);
    return { status: 'success', subscribed: symbols };
  }

  @Get('candles')
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('range') range?: string,
  ) {
    if (!symbol) throw new HttpException('Symbol query parameter is required', HttpStatus.BAD_REQUEST);
    const data = await this.marketService.getCandles(symbol, interval || '1wk', range || '1Y');
    return { status: 'success', ...data, data, timestamp: new Date().toISOString() };
  }

  @Get('sparkline')
  async getSparkline(@Query('symbols') symbols: string) {
    if (!symbols) throw new HttpException('Symbols query parameter is required', HttpStatus.BAD_REQUEST);
    const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase());
    const sparklines = await this.marketService.getSparklines(symbolList);
    return { status: 'success', data: sparklines };
  }
}
