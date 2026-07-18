import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LabsService } from './labs.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  create(@Body() createLabDto: CreateLabDto, @CurrentUser('id') clerkId: string) {
    return this.labsService.create(createLabDto, clerkId);
  }

  @Get()
  findAll(
    @CurrentUser('id') clerkId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.labsService.findAll(clerkId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      patientId,
    });
  }

  @Get(':id')
  findOne(
    @Param('id') id: string, 
    @CurrentUser('id') clerkId: string,
    @Query('patientId') patientId?: string
  ) {
    return this.labsService.findOne(id, clerkId, patientId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLabDto: UpdateLabDto, @CurrentUser('id') clerkId: string) {
    return this.labsService.update(id, updateLabDto, clerkId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') clerkId: string) {
    return this.labsService.remove(id, clerkId);
  }
}
