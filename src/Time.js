import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import juration from './juration';
import jQuery from 'jquery';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

export class Time extends XComponent {
	constructor() {
		super({
			actions: {
				selectWorkTime(date) {
					if (this.state.selectedWorkTime && this.state.selectedWorkTime.getTime() == date.getTime()) {
						this.setState({
							selectedWorkTime: null
						});
					}
					else {
						this.setState({
							selectedWorkTime: date
						})						
					}
				}				
			}
		});

		this.state = {};
	}
	time(start, end, schedule) {
		let current = start.clone().addDays(1).beginningOfDay();
		let time = 0;
		while (true) {
			time += schedule(current)*60*60;
			current.addDays(1);

			if (current.getTime() > end.getTime()) return time;
		}
	}

	updateCont() {
		let mainEl = jQuery('main');
		mainEl.outerHeight(jQuery(window).height() - mainEl.offset().top - 20);
	}

	componentDidMount() {
		jQuery(window).resize(() => {
			this.updateCont();
		});
		this.updateCont();
	}

	componentWillUnmount() {
		super.componentWillUnmount();
		jQuery('main').height('');
	}

	dates() {
		let entries = [];
		for (let entity of db.entities) {
			if (entity.milestones) {
				let milestone = entity.milestones.find((milestone) => !milestone.completed);
				if (milestone) {
					entries.push({
						milestone: milestone,
						entity: entity
					});					
				}
			}
		}

		let entriesByDate = {};

		for (let entry of entries) {
			let date = entry.milestone.deadline.beginningOfDay();
			if (!entriesByDate[date.getTime()]) {
				entriesByDate[date.getTime()] = [];
			}
			entriesByDate[date.getTime()].push(entry);
		}
		
		let tmp = [];
		for (let date in entriesByDate) {
			tmp.push({
				date: new Date(parseInt(date)),
				entries: entriesByDate[date]
			});
		}

		tmp.sort((a, b) => {
			return b.date.getTime() - a.date.getTime();
		});

		entriesByDate = tmp;

		let dates = [];
		for (let i = 0; i < entriesByDate.length; ++ i) {
			let entryI = entriesByDate[i];
			let date = {
				date: entryI.date,
				entries: [],
			};
			dates.push(date);
			for (let j = i; j < entriesByDate.length; ++ j) {
				let entryJ = entriesByDate[j];
				date.entries = date.entries.concat(entryJ.entries);
			}
		}
		dates.sort((a, b) => a.date.getTime() - b.date.getTime());

		return dates;
	}

	xRender() {
		let dates = this.dates();

		let schedules = {
			allTime(date) {
				return 24;
			},
			timeDuringDays(date) {
				return 14;
			},
			timeDuringWorkDays(date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 14;
			},
			sixHourWorkDays(date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 6;
			},
			eightHourWorkDays(date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 8;
			},
			eightHoursPerDay(date) {
				return 8;
			},
		};

		let currentTime = new Date();

		return (
			<div className="time-view">
				{this.state.selectedWorkTime && <div className="entities">
					{dates.find((date) => date.date.getTime() == this.state.selectedWorkTime.getTime()).entries.map((entry) => {
						return (
							<div key={entry.entity._id}>
								<Link to={`/entities/${entry.entity._id}`}>
								{Models.Entity.display(entry.entity)}
								{juration.stringify(entry.milestone.time)}
								{entry.milestone.deadline.format('{Mon} {d}')}
								</Link>
							</div>
						);
					})}
				</div>}
				<div className="dates">
				{dates.map((date) => {
					let times = [];
					for (let schedule in schedules) {
						times.push({
							name: schedule,
							time: this.time(currentTime, date.date, schedules[schedule])
						});
					}
					times.sort((a, b) => b.time - a.time);

					let maxTime = times[0].time;

					let totalWorkTime = 0;
					for (let entry of date.entries) {
						totalWorkTime += entry.milestone.time;
					}

					return (
						<div className="date" key={date.date.getTime()}>
							<div className="date__date">{date.date.format('{Mon} {d}')}</div>
							<div className="date__times">
								<div onClick={this.actions.selectWorkTime.bind(date.date)} className={classNames('work-time', {selected:this.state.selectedWorkTime && date.date.getTime() == this.state.selectedWorkTime.getTime()})} style={{height:Math.round((totalWorkTime/maxTime)*100) + '%'}} />
								{times.map((time) => {
									return (
										<div className="time" style={{height:Math.round((time.time/maxTime)*100) + '%'}} key={time.name}>
											{time.name}
											{/*<div>{juration.stringify(time.time)}</div>*/}
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
				</div>
			</div>
		);
	}
}