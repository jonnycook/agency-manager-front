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

	countDays(start, end, test) {
		let current = start.clone().addDays(1).beginningOfDay();
		let total = 0;
		while (true) {
			if (test(current)) total ++;
			current.addDays(1);
			if (current.getTime() > end.getTime()) return total;
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
						date: milestone.deadline,
						milestone: milestone,
						entity: entity
					});					
				}
			}

			if (entity.workBlocks) {
				let workBlock = entity.workBlocks.find((workBlock) => !workBlock.completed);
				if (workBlock) {
					entries.push({
						date: workBlock.end,
						workBlock: workBlock,
						entity: entity
					});					
				}

			}
		}

		let entriesByDate = {};

		for (let entry of entries) {
			let date = entry.date.beginningOfDay();
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
		let minDate, maxDate;
		for (let date of dates) {
			for (let entry of date.entries) {
				if (entry.milestone) {
					if (!minDate || entry.milestone.deadline.isBefore(minDate)) {
						minDate = entry.milestone.deadline;
					}
					if (!maxDate || entry.milestone.deadline.isAfter(maxDate)) {
						maxDate = entry.milestone.deadline;
					}
				}
				else if (entry.workBlock) {
					if (!minDate || entry.workBlock.start.isBefore(minDate)) {
						minDate = entry.workBlock.start;
					}
					if (entry.workBlock.end.isBefore(minDate)) {
						minDate = entry.workBlock.end;
					}
					if (!maxDate || entry.workBlock.start.isAfter(maxDate)) {
						maxDate = entry.workBlock.start;
					}
					if (entry.workBlock.end.isAfter(maxDate)) {
						maxDate = entry.workBlock.end;
					}
				}
			}
		}

		let allWorkLogEntries = db.work_log_entries.filter((entry) => {
			return entry.end.isBetween(minDate, maxDate);
		});

		for (let date of dates) {
			for (let entry of date.entries) {
				if (entry.workBlock) {
					entry.workedTime = allWorkLogEntries.filter((workLogEntry) => {
						return workLogEntry.activity.object.entity == entry.entity._id && workLogEntry.end.isBetween(entry.workBlock.start, entry.workBlock.end);
					}).reduce((total, workLogEntry) => {
						return total + (workLogEntry.end.getTime() - workLogEntry.start.getTime())
					}, 0)/1000;
				}
			}
		}

		let dayTotals = [
			{
				name: 'Every Day',
				test(date) {
					return true;
				}
			},
			{
				name: 'Week Days',
				test(date) {
					return !(date.getDay() == 0 || date.getDay() == 6);
				}
			},
		];

		let schedules = {
			'Every day': (date) => {
				return 24;
			},
			'Time during days': (date) => {
				return 14;
			},
			'Time during work days': (date) => {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 14;
			},
			'6 hrs/Workdays': (date) => {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 6;
			},
			'8 hrs/Workdays': (date) => {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 8;
			},
			'8 hrs/Day': (date) => {
				return 8;
			},
			'6 hrs/Day': (date) => {
				return 6;
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
								{entry.milestone && <span>
									{juration.stringify(entry.milestone.time)}
									{entry.milestone.deadline.format('{Mon} {d}')}
								</span>}
								{entry.workBlock && <span>
									{juration.stringify(entry.workBlock.time - entry.workedTime)}
									{entry.workBlock.end.format('{Mon} {d}')}
								</span>}
								</Link>
							</div>
						);
					})}
				</div>}
				<div className="dates">
				{dates.map((date) => {
					let tmp = {};
					for (let schedule in schedules) {
						let time = this.time(currentTime, date.date, schedules[schedule]);
						if (!tmp[time]) {
							tmp[time] = [];
						}
						tmp[time].push(schedule);
					}

					let times = [];
					for (let time in tmp) {
						times.push({
							time: parseInt(time),
							names: tmp[time]
						});
					}

					let totalWorkTime = 0;
					for (let entry of date.entries) {
						if (entry.milestone) {
							totalWorkTime += entry.milestone.time;							
						}
						else if (entry.workBlock) {
							// let workedTime = allWorkLogEntries.filter((workLogEntry) => {
							// 	return workLogEntry.activity.object.entity == entry.entity._id && workLogEntry.end.isBetween(entry.workBlock.start, entry.workBlock.end);
							// }).reduce((total, workLogEntry) => {
							// 	return total + (workLogEntry.end.getTime() - workLogEntry.start.getTime())
							// }, 0)/1000;

							totalWorkTime += Math.max(0, entry.workBlock.time - entry.workedTime);
						}
					}

					let a = [];
					for (let daysCounter of dayTotals) {
						let totalDays = this.countDays(currentTime, date.date, daysCounter.test);
						console.log(totalDays, daysCounter.name, );
						a.push(`${juration.stringify(totalWorkTime/totalDays)}/${daysCounter.name}`);
					}


					times.push({
						time: totalWorkTime,
						names: a
					});

					times.sort((a, b) => b.time - a.time);

					let maxTime = times[0].time;


					return (
						<div className="date" key={date.date.getTime()}>
							<div className="date__date">{date.date.format('{Mon} {d}')}</div>
							<div className="date__times">
								<div onClick={this.actions.selectWorkTime.bind(date.date)} className={classNames('work-time', {selected:this.state.selectedWorkTime && date.date.getTime() == this.state.selectedWorkTime.getTime()})} style={{height:Math.round((totalWorkTime/maxTime)*100) + '%'}} />
								{times.map((time) => {
									return (
										time.time > 0 ? <div className="time" style={{height:Math.round((time.time/maxTime)*100) + '%'}} key={time.time}>
											{time.names.join(', ')}
											{/*<div>{juration.stringify(time.time)}</div>*/}
										</div> : null
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