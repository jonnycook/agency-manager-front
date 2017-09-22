import React from 'react';
import { /*XMap, */XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';


import _ from 'lodash';

export class Tasks extends XComponent {
	constructor() {
		super({
			actions: {
				addTask() {
					db.tasks.push({
						_id: XObject.id(),
						createdAt: new Date()
					});
				},
				deleteTask(task) {
					Collection.removeDocument('tasks', task);
				},
				done(task) {
					task.completed = true;
				}
			}
		});

	}
	groupedTasks() {
		var grouped = {};
		// db.tasks.length;
		for (var task of db.tasks) {
			if (task.completed) continue;
			if (!grouped[task.entity]) {
				grouped[task.entity] = [];
			}
			grouped[task.entity].push(task);
		}
		return _.map(grouped, (value, key) => (
			{
				entity: Collection.findById('entities', key),
				tasks: value			
			}
		));
	}
	xRender() {
		return (
			<div className="tasks">
				<h1>Tasks</h1>
				{this.groupedTasks().map(entry => (
					<div className="tasks__group" key={entry.entity ? entry.entity._id : 'none'}>
						<h2>{Models.Entity.display(entry.entity)}</h2>
						<ul>
							{entry.tasks.map(task => {
								return (
									<li key={task._id}>
										<div className="tasks__task item">
											<div className="task__title">
											Title: 
											<PropertyField object={task} property="title" />
											</div>

											<div className="task__description">
											Description: 
											<PropertyField object={task} property="description" />
											</div>


											<div>
												Deadline: 
												<PropertyField className="task__deadline" object={task} property="deadline" type="text" />
											</div>

											<div>
												Time Left: 
												<PropertyField className="task__timeLeft" object={task} property="timeLeft" type="text" />
											</div>

											<div>
												<span className="label">Assigned To:</span>
												<EntitySelector type="Team Member" set={(value) => task.assignedTo = value} entity={() => task.assignedTo} />
											</div>
											<div>
												<span className="label">Entity:</span>
												<EntitySelector set={(value) => task.entity = value} entity={() => task.entity} />
											</div>

											<button onClick={this.actions.done(task)}>Done</button>
											{/*<span className="date">{task.createdAt.toString()}</span>*/}
											<button onClick={this.actions.deleteTask(task)}>Delete</button>

										</div>
									</li>
								);
							})}
						</ul>

					</div>
				))}
				<button onClick={this.actions.addTask}>Add</button>
			</div>
		);
	}
}
