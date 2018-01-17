import React from 'react';
import { /*XMap, */XObject,/* XStrip,*/ XComponent } from '../XObject';
import { db, Models, collections } from '../db';
import { PropertyField, EntitySelector } from '../UI';
import { Link } from 'react-router-dom';

export class WorkProcesses extends XComponent {
	constructor() {
		super({
			actions: {
				delete(workProcess) {
					db.work_processes.splice(db.work_processes.indexOf(workProcess), 1);
				},
				add() {
					db.work_processes.push(XObject.obj({state:'Created'}));
				}
			}
		})	
	}
	xRender() {
		return (
			<div>
				<ul>
					{db.work_processes.filter((workProcess) => ['Running', 'Paused', 'Waiting', 'Created'].indexOf(workProcess.state) != -1).map((workProcess) => {
						return (
							<li key={workProcess._id}>
								{workProcess.state}
								<Link to={`/work/processes/${workProcess._id}`}>{Models.Entity.display(collections.entities.findById(workProcess.focusEntity))}</Link>
								<button onClick={this.actions.delete.bind(workProcess)}>Delete</button>
							</li>
						);
					})}		
				</ul>
				<button onClick={this.actions.add}>Add</button>
			</div>
		);
	}
}