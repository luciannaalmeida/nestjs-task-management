import { User } from 'src/auth/user.entity';
import { EntityRepository, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { TaskStatus } from './task-status.enum';
import { Task } from './task.entity';
import { InternalServerErrorException, Logger } from '@nestjs/common';

const TaskFilters = {
  status: (target, query) => {
    query.andWhere('task.status = :status', { status: target });
  },
  search: (target, query) => {
    query.andWhere(
      '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
      { search: `%${target}%` },
    );
  },
};

@EntityRepository(Task)
export class TasksRepository extends Repository<Task> {
  // the true value indicates the time spent will be logged within the log msg
  private logger = new Logger('TasksRepository', { timestamp: true });

  async getTasks(filterDto: GetTasksFilterDto, user: User): Promise<Task[]> {
    const query = this.createQueryBuilder('task');
    query.where({ user });
    for (const filterKey in filterDto) {
      const filterValue = filterDto[filterKey];
      TaskFilters[filterKey](filterValue, query);
    }
    try {
      const tasks = await query.getMany();
      return tasks;
    } catch (error) {
      this.logger.error(
        `Failed to get tasks for user "${
          user.username
        }". Filters: ${JSON.stringify(filterDto)}`,
        error.stack,
      );
      throw new InternalServerErrorException();
    }
  }

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description } = createTaskDto;
    const task = this.create({
      title,
      description,
      status: TaskStatus.OPEN,
      user,
    });
    await this.save(task);
    return task;
  }
}
