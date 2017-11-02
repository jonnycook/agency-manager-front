import React from 'react';
import { XMap, XObject, XComponent, XStrip } from './XObject';
import { EntitySelector, Entity, ValueDisplay } from './UI';
import { initDb, db, Models, Collection, applyChanges } from './db';
import { Tasks } from './Tasks';
import { Invoice } from './Invoice';
import { Issues } from './Issues';
import { Tickets } from './Tickets';
import { Income } from './Income';
import { WorkLog } from './WorkLog';
import { EntityWorkLog } from './EntityWorkLog';
import { YourIncome } from './YourIncome';
import classNames from 'classnames';
import pluralize from 'pluralize';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom'
import axios from 'axios';

import './App.css';
import Sugar from 'sugar';

import config from './config';

import JSON2 from 'json-stringify-date';


window.XMap = XMap;
window.XStrip = XStrip;

Sugar.extend();

class Day extends XComponent {
  isToday() {
    return this.props.date.isToday();
  }
  tasks() {
    return db.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate.isBetween(this.props.date.clone().beginningOfDay(), this.props.date.clone().endOfDay()));
  }
  entities() {
    return db.entities.filter((entity) => {
      var dateProp = entity.properties.find((property) => property.type == 'date');
      if (dateProp) {
        var date = Date.create(dateProp.value);
        if (date) {
          return date.isBetween(this.props.date.clone().beginningOfDay(), this.props.date.clone().endOfDay());  
        }        
      }
    }).map((entity) => {
      var date = entity.properties.find((property) => property.type == 'date');
      return {
        name: Models.Entity.display(entity),
        dateLabel: date.name,
        date: date.value,
        entity: entity
      };
    });
  }
  xRender() {
    return (
      <div className={classNames(this.props.className, {today: this.isToday(), 'current-month': this.props.date.isThisMonth()})}>
        <span className="date">{this.props.date.getDate()}</span>
        <ul className="tasks">
          {this.tasks().map(task => <li key={task._id}><span className="task__entity">{Models.Entity.display(Collection.findById('entities', task.entity), false)}</span> {task.title} ({task.deadline}) <input type="checkbox" onClick={() => task.completed = 'true'} /></li>)}
        </ul>
        <ul className="entities">
          {this.entities().map(entry => <li key={entry.entity._id}><Link to={`/entities/${entry.entity._id}`}>{entry.name}</Link> &mdash; {entry.dateLabel}</li>)}
        </ul>
      </div>
    );
  }
}

class Calendar extends XComponent {
  constructor() {
    super({
      actions: {
        next() {
          this.setState({
            currentMonth: this.state.currentMonth.clone().addMonths(1)
          });
        },
        prev() {
          this.setState({
            currentMonth: this.state.currentMonth.clone().addMonths(-1)
          });
        }
      }
    });

    this.state = {
      currentMonth: new Date()
    }
  }
  month() {
    var firstCalendarDay = this.state.currentMonth.clone().beginningOfMonth();
    firstCalendarDay.addDays(-firstCalendarDay.getDay());

    var day = firstCalendarDay.clone();

    var month = [];
    for (var i = 0; i < 6; ++ i) {
      var week = [];
      for (var j = 0; j < 7; ++ j) {
        week.push(day);
        day = day.clone();
        day.addDays(1);
      }
      month.push(week);
    }

    return month;
  }

  currentMonthName() {
    return this.state.currentMonth.format('%B');
  }

  currentYear() {
    return this.state.currentMonth.format('%Y');
  }

  xRender() {
    return (
      <div className="calendar">
        <div className="month-name">
          <button onClick={this.actions.prev}>Prev</button>
          <span className={classNames({'current-month': this.state.currentMonth.isThisMonth()})}>{this.currentMonthName()} {this.currentYear()}</span>
          <button onClick={this.actions.next}>Next</button>
        </div>

        <div className="header">
          <div className="day">S</div>
          <div className="day">M</div>
          <div className="day">T</div>
          <div className="day">W</div>
          <div className="day">T</div>
          <div className="day">F</div>
          <div className="day">S</div>
        </div>
        {this.month().map((week) => {
          return (
            <div className="week" key={week[0].toString()}>
              {week.map((day) => {
                return (
                  <Day key={day.toString()} className="day" date={day} />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
}


class Entities extends XComponent {
  constructor() {
    super({
      actions: {
        addEntity() {
          db.entities.push({
            _id: XObject.id(),
            type: this.props.type,
            properties: [],
            data: [],
          });
        },
        deleteEntity(entity) {
          Collection.removeDocument('entities', entity);
        }
      }
    });

    window._app = this;
  }

  entities() {
    if (this.props.type) {
      return db.entities.filter((entity) => entity.type === this.props.type);
    }
    else {
      return db.entities;
    }
  }

  xRender() {
    return (
      <div className="entities">
        <h1>{pluralize(this.props.type || 'All Entities')}</h1>
        <ul>
          {this.entities().map(entity => {
            return <li key={entity._id}>
              <Entity key={entity._id} entity={entity} />
              <button onClick={this.actions.deleteEntity(entity)}>Delete</button>
            </li>
          })}
        </ul>
        <button onClick={this.actions.addEntity}>Add</button>
      </div>
    );
  }
}

class Overview extends XComponent {
  xRender() {
    return (
      <ul className="overview">
        {db.entities.filter((entity) => entity.type === 'Client').map((client) => {
          var projects = Models.Entity.relatedEntities(client, 'Project')

          return (
            <li key={client._id} className={classNames((Models.Entity.state(client, 'Status').value || ''))}>
              <h3 className="status-cont" data-status={Models.Entity.state(client, 'Status').value}><Link to={`/entities/${client._id}`}>{Models.Entity.property(client, 'Name')}</Link></h3>
              {Models.Entity.state(client, 'Waiting Since').value &&
              <div><h4>Waiting Since</h4>
              <ValueDisplay {...Models.Entity.state(client, 'Waiting Since')} /></div>}

              {Models.Entity.state(client, 'Deadline').value &&
              <div><h4>Deadline</h4>
              <ValueDisplay {...Models.Entity.state(client, 'Deadline')} /></div>}
              
              {Models.Entity.state(client, 'Overview').value &&
              <div><h4>Overview</h4>
              <ValueDisplay {...Models.Entity.state(client, 'Overview')} /></div>}

              {!!projects.length && <div>
                <h4>Projects</h4>
                <ul>
                  {projects.map(project => {
                    return (
                      <li key={project._id} className={classNames((Models.Entity.state(project, 'Status').value || ''))}>
                        <Link className="status-cont" data-status={Models.Entity.state(project, 'Status').value} to={`/entities/${project._id}`}>{Models.Entity.property(project, 'Name')}</Link>
                        {Models.Entity.state(project, 'Overview').value &&
                        <div><h4>Overview</h4>
                        <ValueDisplay {...Models.Entity.state(project, 'Overview')} /></div>}
                      </li>
                    ); 
                  })}
                </ul>
              </div>}
            </li>
          );
        })}
      </ul>
    );
  }
}


var socket;
var localClosed = false;

function connect() {
  socket = new WebSocket(config.wsServer);
  window.g_socket = socket;

  // Connection opened
  socket.addEventListener('open', function (event) {
    window.g_app.setState({connected:true});
    
  });

  // Listen for messages
  socket.addEventListener('message', function (event) {
    console.log('Message from server', event.data);
    var message = JSON2.parse(event.data);
    if (message.type === 'push') {
      applyChanges(message.payload);
    }
  });


  socket.addEventListener('close', (event) => {
    window.g_app.setState({connected:false});
    console.log('closed', event.code);
    if (!localClosed) {
      setTimeout(connect, 1000); 
    }
  });

  socket.addEventListener('error', (event) => {
    console.log('error', event);
  });
}
connect();




class App extends XComponent {
  constructor() {
    super({
      actions: {
        async login(e) {
          e.preventDefault();

          var {data} = await axios.post(`${config.apiServer}login`, {
            email: this.refs.email.value,
            password: this.refs.password.value,
          });

          if (data) {
            localStorage.setItem('authKey', data);
            await initDb();
            this.forceUpdate();
          }
        }
      }
    });
    this.state = {
      connected: false
    }
    window.g_app = this;
    if (localStorage.getItem('authKey')) {
      initDb().then(() => this.forceUpdate());      
    }
  }

  entityTypes() {
    var types = {};
    for (var entity of db.entities) {
      types[entity.type] = true;
    }
    return Object.keys(types);
  }

  xRender() {

    if (!localStorage.getItem('authKey')) {
      return (<div>
        <form onSubmit={this.actions.login}>
        <input type="text" placeholder="Email" ref="email" />
        <input type="text" placeholder="Password" ref="password" />
        <input type="submit" />
        </form>
      </div>
      );
    }

    return db && <Router ref="router">

    <div>
      {!this.state.connected && <span style={{position:'fixed', top: 0, left: 0}}>Disconnected. Changes will not be saved.</span>}
      <ul className="side-bar">
        <li><Link to="/overview">Overview</Link></li>
        <li>
          <Link to="/entities">All Entities</Link>
          <ul>
            {this.entityTypes().map((type) => <li key={type}><Link to={`/entities/type/${type}`}>{pluralize(type)}</Link></li>)}
          </ul>
        </li>
        <li>
          <Link to="/tasks">Tasks</Link>
          <ul>
            <li><Link to="/calendar">Calendar</Link></li>
          </ul>
        </li>
        <li><Link to="/issues">Issues</Link></li>
        <li><Link to="/tickets">Tickets</Link></li>
        <li><Link to="/work-log">Work Log</Link></li>
        <li>
          <Link to="/income">Income</Link>
          <ul>
            <li><Link to="/your-income">Your Income</Link></li>
          </ul>
        </li>
      </ul>
      <div className="main-column">
        <div className="header">
          <EntitySelector className="search-bar"  hideButtons={true} editing={true} set={(entity) => this.refs.router.history.push(`/entities/${entity}`)} />
        </div>
        <main>
          <Route exact path="/" component={Entities}/>
          <Route exact path="/overview" component={Overview}/>
          <Route exact path="/calendar" component={Calendar}/>
          <Route exact path="/entities" component={Entities}/>
          <Route exact path="/entities/type/:type" component={({match}) => <Entities type={match.params.type} />} />
          <Route exact path="/entities/:id" component={({match}) => <Entity entity={Collection.findById('entities', match.params.id)} />}/>
          <Route exact path="/tasks" component={Tasks} />
          <Route exact path="/issues" component={Issues} />
          <Route exact path="/tickets" component={Tickets} />
          <Route exact path="/income" component={Income} />
          <Route exact path="/your-income" component={YourIncome} />
          <Route exact path="/work-log" component={WorkLog} />
          <Route exact path="/work-log/entities/:id" component={({match}) => <EntityWorkLog entity={Collection.findById('entities', match.params.id)} />} />
          <Route exact path="/invoices/:id" component={({match}) => <Invoice invoice={Collection.findById('invoices', match.params.id)} />} />
        </main>
      </div>
    </div>
  </Router>
  }
}

export default App
