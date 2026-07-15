import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUser('id') clerkId: string,
    @Query('q') query: string,
  ) {
    if (!query) return [];
    return this.searchService.searchRecords(clerkId, query);
  }
}
