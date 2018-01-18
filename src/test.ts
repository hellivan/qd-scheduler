import {QdScheduler, Task} from './index';

//The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; 
}

class SleepTask implements Task {

    constructor(public name: string, private timeout: number) {}
    
    public exec(): Promise<any> {
	return new Promise(resolve => setTimeout(resolve, this.timeout));
    }
}


let taskNo = 0;

function generateTasks(scheduler: QdScheduler<SleepTask>, count: number) {
    for(let i = 0; i < count; i++) {
	const task = new SleepTask(`Task ${taskNo++}`, getRandomInt(1, 5) * 1000);
	try {
	    scheduler.queueTask(task);
	} catch(err) {
	    console.error(`Error while queuing task ${task.name}`, err);
	}
	
	
    }
}


const scheduler = new QdScheduler<SleepTask>(1, 10);

scheduler.taskQueued$.subscribe(task => console.log(`task ${task.name} queued`));
scheduler.taskStarting$.subscribe(task => console.log(`task ${task.name} started`));
scheduler.taskError$.subscribe(({err, task}) => console.log(`error for task ${task.name}`, err));
scheduler.taskCompleted$.subscribe(task => console.log(`task ${task.name} completed`));

scheduler.queuedTasksCount$.subscribe(c => console.log(`queued tasks: ${c}`));
scheduler.runningTasksCount$.subscribe(c => console.log(`running tasks: ${c}`));


scheduler.start();

//generateTasks(scheduler, 10);

setInterval(() => generateTasks(scheduler, getRandomInt(1, 5)), 5 * 1000);
