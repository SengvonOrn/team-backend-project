import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CommentsController } from './comment.controller';
import { CommentsService } from './comment.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
