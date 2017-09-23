import React from 'react';
import { /*XMap, */XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';


import _ from 'lodash';

export class Tickets extends XComponent {
	constructor() {
		super({
			actions: {
				done(task) {
					task.completed = true;
				},
				done(ticket) {
					Collection.removeDocument('pm_tickets', ticket);
				},
			}
		});

	}
	groupedTasks() {
		var grouped = {};
		// db.tasks.length;
		for (var task of db.pm_tickets) {
			if (task.completed) continue;
			if (!grouped[task.project]) {
				grouped[task.project] = [];
			}
			grouped[task.project].push(task);
		}
		return _.map(grouped, (value, key) => (
			{
				entity: Collection.findById('entities', key),
				tickets: value			
			}
		));
	}
	xRender() {
		return (
			<div className="tickets">
				<h1>Tickets</h1>
				{this.groupedTasks().map(entry => (
					<div className="tickets__group" key={entry.entity ? entry.entity._id : 'none'}>
						<h2>{Models.Entity.display(entry.entity)}</h2>
						<ul>
							{entry.tickets.map(task => {
								return (
									<li key={task._id}>
										<div className="tickets__ticket item">
											<div className="ticket__title">
												Brief: 
												<PropertyField object={task} property="brief" />
											</div>
											<div className="ticket__title">
												Description: 
												<PropertyField object={task} property="content.text" />
											</div>
											<div className="ticket__title">
												Component: 
												<PropertyField object={task} property="component" />
											</div>
											<div className="ticket__title">
												Priority: 
												<PropertyField object={task} property="priority" />
											</div>
											<div className="ticket__title">
												Type: 
												<PropertyField object={task} property="type" />
											</div>
											{/*<div>
												<span className="label">Project:</span>
												<EntitySelector type="Project" set={(value) => task.project = value} entity={() => task.project} />
											</div>*/}
											<button onClick={this.actions.done(task)}>Done</button>
											<button onClick={this.actions.done(task)}>Delete</button>
										</div>
									</li>
								);
							})}
						</ul>

					</div>
				))}
			</div>
		);
	}
}
