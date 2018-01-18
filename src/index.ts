import {BehaviorSubject, Observable, Subject} from 'rxjs/Rx';

export interface Task {

    exec: () => Promise<any>;
    
}

class TaskQueue<T extends Task> {
    private tasks: T[] = [];

    private sizeSubject = new BehaviorSubject<number>(0);

    public size$: Observable<number>;
    
    constructor(private maxSize: number) {
	this.size$ = this.sizeSubject.asObservable();
    }

    get size(): number {
	return this.tasks.length;
    }

    get freeSlots(): number {
	return this.maxSize - this.size;
    }

    get full(): boolean {
	return this.freeSlots < 1;
    }

    get empty(): boolean {
	return this.size < 1;
    }
    
    public push(t: T) {
	if(this.full) throw new Error('TaskQueue full. Cannot add new Tasks');
	this.tasks.push(t);
	this.sizeSubject.next(this.tasks.length);
    }

    public pop(): T {
	if(this.empty) return undefined;
	const t = this.tasks.shift();
	this.sizeSubject.next(this.tasks.length);
	return t;
    }

    public drop(t: T): boolean {
	const index = this.tasks.indexOf(t);
	if(index >= 0) this.tasks.splice(index, 1);
	this.sizeSubject.next(this.tasks.length);
	return index >= 0;
    }
}


export class QdScheduler<T extends Task> {

    private taskQueuedSubject = new Subject<T>();
    private taskStartingSubject = new Subject<T>();
    private taskErrorSubject = new Subject<{err: any, task: T}>();
    private taskCompletedSubject = new Subject<T>();
    
    private currentTasks: TaskQueue<T>;
    private queuedTasks: TaskQueue<T>;

    public taskQueued$: Observable<T>;
    public taskStarting$: Observable<T>;
    public taskError$: Observable<{err: any, task: T}>;
    public taskCompleted$: Observable<T>;

    public queuedTasksCount$: Observable<number>;
    public runningTasksCount$: Observable<number>;

    
    constructor(parallelTasks: number = 10, maxQueuedTasks: number = 200) {
	this.currentTasks =  new TaskQueue<T>(parallelTasks);
	this.queuedTasks = new TaskQueue<T>(maxQueuedTasks);
	
	this.taskQueued$ = this.taskQueuedSubject.asObservable();
	this.taskStarting$ = this.taskStartingSubject.asObservable();
	this.taskError$ = this.taskErrorSubject.asObservable();
	this.taskCompleted$ = this.taskCompletedSubject.asObservable();

	// TODO change this?
	this.queuedTasksCount$ = this.queuedTasks.size$;
	this.runningTasksCount$ = this.currentTasks.size$;
    }

    public queueTask(t: T): void {
	this.queuedTasks.push(t);
	this.taskQueuedSubject.next(t);
    }

    public start(): void {
	Observable.merge(
	    this.taskCompletedSubject.map(x => true),
	    this.taskQueuedSubject.map(x => true),
	    Observable.of(true)
	).subscribe(
	    () => this.executeTasks()
	);
    }


    private executeTasks(): void {
	while(this.currentTasks.freeSlots > 0 && !this.queuedTasks.empty) {
	    const task = this.queuedTasks.pop();
	    this.currentTasks.push(task);
	    this.taskStartingSubject.next(task);

	    Promise.resolve()
		.then(() => task.exec())
		.catch(err => this.taskErrorSubject.next({err, task}))
		    .then(() => {
			this.currentTasks.drop(task);
			this.taskCompletedSubject.next(task)
		    });
	}
    }

}
