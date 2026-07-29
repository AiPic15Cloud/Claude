import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [ActivitiesModule, StorageModule],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
