import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Post()
  create(@Body() createMedicationDto: CreateMedicationDto, @CurrentUser('id') clerkId: string) {
    return this.medicationsService.create(createMedicationDto, clerkId);
  }

  @Get()
  findAll(
    @CurrentUser('id') clerkId: string,
    @Query('isActive') isActive?: string
  ) {
    const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
    return this.medicationsService.findAll(clerkId, { isActive: isActiveBool });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') clerkId: string) {
    return this.medicationsService.findOne(id, clerkId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMedicationDto: UpdateMedicationDto, @CurrentUser('id') clerkId: string) {
    return this.medicationsService.update(id, updateMedicationDto, clerkId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') clerkId: string) {
    return this.medicationsService.remove(id, clerkId);
  }
}
