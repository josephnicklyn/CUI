const Layout = require("../base/Layout");
const termutils = require("../base/termutils");


const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function isLeapYear(year) {
    if (year % 4 !== 0) {
    return false;
    }
    if (year % 100 === 0 && year % 400 !== 0) {
    return false;
    }
    return true;
}

function monthLength(year, month=0) {
    let ly = isLeapYear(year);
    return MONTH_LENGTHS[month] + (month == 1 && ly ? 1 : 0);
}

function firstDay(year, month = 0) {
    // Use Zeller’s Congruence adapted to return Sunday = 0 ... Saturday = 6
    let q = 1; // Day of month
    let m = month + 1;
    let y = year;

    if (m <= 2) {
        m += 12;
        y -= 1;
    }

    const K = y % 100;
    const J = Math.floor(y / 100);

    const h = (q + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) +
               Math.floor(J / 4) + 5 * J) % 7;

    // Zeller's: 0 = Saturday, 1 = Sunday, ..., 6 = Friday
    // Convert to: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return (h + 6) % 7;
}

function getToday() {
    let date = new Date();
    return {day: date.getDate(), month:date.getMonth(), year:date.getFullYear()}
}
class DatePicker extends Layout {
    #offset = {x: 0, y: 0};
    #nav_actions = [];
    constructor(options={}) {
        super(options);
        
        this.isFocusable = true;
        this.calendarEvents = [
            {date: "10/12/2025"},
            {date: "4/06/2025"},
        ]
        this.setToday(options);
    }

    setToday(options = {}) {
        this.state = {
            year: options.year ?? getToday().year,
            month: options.month ?? getToday().month,
            selectedDay: options.day ?? getToday().day
        };
    }

    nextMonth() {
        if (++this.state.month > 11) {
            this.state.month = 0;
            this.state.year++;
        }
        this.render(true);
    }
    
    prevMonth() {
        if (--this.state.month < 0) {
            this.state.month = 11;
            this.state.year--;
        }
        this.render(true);
    }

    getMonthlyEvents(month=0, year=0) {
        let mStr = `${month+1}`;
        let yStr = `${year}`;
        let results = [];
        for(let ev of this.calendarEvents) {
            if (ev.date.startsWith(mStr) && ev.date.endsWith(yStr)) {
                let day = parseInt(ev.date.split("/")[1]);
                    
                results.push(day)
            }
        }
        return results;
    }

    drawMonthCalendarFrame() {
        let x = Math.floor(this.width/2)-21;
        let y = Math.floor(this.height/2)-9;
        this.#offset = {x, y};
        this.#nav_actions = [
            {pos: x+2, type: 'month', delta: -1 },
            {pos: x+4, type: 'month', delta: 1 },
            {pos: x+38, type: 'year', delta: -1 },
            {pos: x+40, type: 'year', delta: 1 } 
        ]
        x+=this.sceneX;
        y+=this.sceneY;
        let year=this.state.year;
        let month=this.state.month;
        let dateString = ` ${MONTH_NAMES[month]}, ${year} `
        let calendarTitle = termutils.padString(dateString, 41, "center") ;
        let frameTop =     '┌─────────────────────────────────────────┐'
        let weekAbove =    '├─────┬─────┬─────┬─────┬─────┬─────┬─────┤'
        let weekString =   '│ SUN │ MON │ TUE │ WED │ THU │ FRI │ SAT │';
        let weekBelow =    '├─────┼─────┼─────┼─────┼─────┼─────┼─────┤'
        let frameBottom =  '└─────┴─────┴─────┴─────┴─────┴─────┴─────┘'
        let dayRow =       '│     │     │     │     │     │     │     │';
        let dayBreak  =    '├─────┼─────┼─────┼─────┼─────┼─────┼─────┤';
        let t = y;
        let rect = {
            width: 43, 
            height: 17, 
            sceneX: x, 
            sceneY: t
        };

        this.getStage().sceneDrawText(frameTop, rect, termutils.COLORS.control.fill);
        rect.sceneY++;
        this.getStage().setChar(rect.sceneY, rect.sceneX, '│', termutils.COLORS.control.fill);
        this.getStage().setChar(rect.sceneY, rect.sceneX+rect.width-1, '│', termutils.COLORS.control.fill);
        
        this.getStage().sceneDrawText(calendarTitle, {...rect, sceneX: rect.sceneX+1}, termutils.COLORS.control.loud);
        rect.sceneY++;
        this.getStage().sceneDrawText(weekAbove, rect, termutils.COLORS.control.fill);
        rect.sceneY++;
        this.getStage().sceneDrawText(weekString, rect, termutils.COLORS.control.fill);
        rect.sceneY++;
        this.getStage().sceneDrawText(weekBelow, rect, termutils.COLORS.control.fill);

        for(let p = 0; p < 6; p++) {
            rect.sceneY++;
            this.getStage().sceneDrawText(dayRow, rect, termutils.COLORS.control.fill);
            if (p != 5) {
                rect.sceneY++;
                this.getStage().sceneDrawText(dayBreak, rect, termutils.COLORS.control.fill);
            }
        }

        rect.sceneY++;
        this.getStage().sceneDrawText(frameBottom, rect, termutils.COLORS.control.fill);
        rect.sceneY = t;
        // TO-DO .... //
        
        let fd = firstDay(year, month);        // Starting day index
        let ml = monthLength(year, month);     // Total days in month
        let totalCells = 42;
        let today = getToday();
        let day = 1;
        let monthFocus = (today.year === year && today.month === month);
        let mEvents = this.getMonthlyEvents(month, year);
        for (let i = 0; i < totalCells; i++) {
            let row = Math.floor(i / 7);
            let col = i % 7;
            let sx = 1 + col * 6;
            let sy = 5 + row * 2;
            let dString = "     ";
            let isToday = false;
            let isSelected = false;
            let color = termutils.COLORS.control.fill2;
            let flagged = mEvents.indexOf(day);

            if (i >= fd && day <= ml) {
                isToday = monthFocus && day === today.day;
                isSelected = day === this.state.selectedDay;
                dString = termutils.padString(`${day} `, 5, 'right');
                day++;
            }
            
            if (isToday && isSelected) {
                color = termutils.COLORS.control.focus_bold;
            } else if (isToday) {
                color = termutils.COLORS.control.fill2_bold;
            } else if (isSelected) {
                color = termutils.COLORS.control.focus;
            }

            this.getStage().sceneDrawText(
                dString, 
                rect, 
                color, 
                false, 
                sx, sy
            );

            if (flagged != -1) {
                this.getStage().setChar(rect.sceneY+sy, rect.sceneX+sx+1, '⚑', color);
            }
            

        }
        
        this.getStage().sceneDrawText('▲ ▼', {sceneY: rect.sceneY+1, sceneX: rect.sceneX+rect.width-5}, termutils.COLORS.control.loud);
        this.getStage().sceneDrawText('◀ ▶', {sceneY: rect.sceneY+1, sceneX: rect.sceneX+2}, termutils.COLORS.control.loud);

    }
    
    render(now = false) {
        if (!this.getParent().isShowing()) {
            return;
        }
       
        if (!this.getStage()) return;
        this.drawMonthCalendarFrame();
        if (now) {
            this.getStage().sceneRenderRect(this.rect);
        }
    }

    handleEvent(event) {
        
        switch (event.type) {
            case 'MouseEvent':
                this.handleMouseEvent(event);
                break;
            case 'KeyEvent':
                return this.handleKeyEvent(event);
        }   
    }

    changeYear(delta) {
        let newYear = this.state.year += delta;
        this.state.year = newYear;
        this.render(true);
    }

    changeMonth(delta) {
        let newYear = this.state.year;
        let newMonth = this.state.month + delta;
        if (newMonth > 11) {
            newMonth = 0;
            newYear = newYear+1;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
        this.state.month = newMonth;
        this.state.year = newYear;
        this.render(true);
    }

    changeWeek(delta, monthLevel = false) {
        let { year, month, selectedDay } = this.state;
    
        // Default to day 1 if none selected
        if (!selectedDay) selectedDay = 1;
    
        // Normalize delta to ±7
        delta = delta < 0 ? -7 : 7;
    
        const ml = monthLength(year, month);
    
        // If monthLevel, compute how many weeks remain to jump to next/prev month
        let skipNWeeks = 1;
        if (monthLevel) {
            if (delta > 0) {
                skipNWeeks = Math.ceil((ml - selectedDay + 1) / 7);
            } else {
                skipNWeeks = Math.ceil((selectedDay - 1) / 7);
            }
        }
        if (skipNWeeks == 0) {
            skipNWeeks = delta<0?1:-1;
        }
        delta *= skipNWeeks;
    
        // Calculate new date
        let newDay = selectedDay + delta;
        let newMonth = month;
        let newYear = year;
    
        // Step backward through months
        while (newDay < 1) {
            newMonth--;
            if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            }
            newDay += monthLength(newYear, newMonth);
        }
    
        // Step forward through months
        while (newDay > monthLength(newYear, newMonth)) {
            newDay -= monthLength(newYear, newMonth);
            newMonth++;
            if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            }
        }
    
        // Update state
        this.state.year = newYear;
        this.state.month = newMonth;
        this.state.selectedDay = newDay;
    
        this.render(true);
    }

    changeDay(delta) {
        let { year, month, selectedDay } = this.state;
    
        // Default to day 1 if none is selected
        if (!selectedDay) selectedDay = 1;
    
        let newDay = selectedDay + delta;
        let newMonth = month;
        let newYear = year;
    
        // Step backward through months if newDay is too small
        while (newDay < 1) {
            newMonth--;
            if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            }
            newDay += monthLength(newYear, newMonth);
        }
    
        // Step forward through months if newDay exceeds this month's length
        while (newDay > monthLength(newYear, newMonth)) {
            newDay -= monthLength(newYear, newMonth);
            newMonth++;
            if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            }
        }
    
        // Update state
        this.state.year = newYear;
        this.state.month = newMonth;
        this.state.selectedDay = newDay;
    
        this.render(true);
    }

    getNavAction(relX, relY) {
        if (relY === this.#offset.y + 1) {
            for(let i = 0; i < this.#nav_actions.length; i++) {
                let it = this.#nav_actions[i];
                if (it.pos === relX) {
                    return i;
                }
            }
        }
        return null;
    }

    #overPrev = null;

    hoverNavs(y, x, updateView = true) {
        termutils.QCODES.CURSOR_HIDE();
        const relX = x - this.sceneX;
        const relY = y - this.sceneY;
        const px = x, py = y;
        
        const over = this.getNavAction(relX, relY); //NAV_ACTIONS.hasOwnProperty(relX) && relY === 1;
        if (updateView) {
            // Reset previous hover
            if (this.#overPrev && (this.#overPrev.x !== px || this.#overPrev.y !== py)) {
                
                this.getStage().setStyle(this.#overPrev.y, this.#overPrev.x, termutils.COLORS.control.fill);
                this.getStage().sceneRenderRect({ sceneX: this.#overPrev.x, sceneY: this.#overPrev.y, width: 1, height: 1 });
                this.#overPrev = null;
            }
    
            // Set new hover
            if (over !== null) {
                this.getStage().setStyle(py, px, termutils.COLORS.control.hover);
                this.#overPrev = { x: px, y: py };
                this.getStage().sceneRenderRect({ sceneX: px, sceneY: py, width: 1, height: 1 });
            }
    
            
        }
    
        return over;// : null;  // return matching nav key or null
    }

    handleMouseEvent(event) {
        if (event.button === 'scroll' 
            && (event.relX >= (this.sceneX + this.#offset.x) && event.relX < (this.sceneX + this.#offset.x + 43))
            && (event.relY >= (this.sceneY + this.#offset.y) && event.relY < (this.sceneY + this.#offset.y + 17))
        ) {
            this.changeMonth(-event.delta);
            return;
        }
    
        if (event.button === 'left') {
            this.requestFocus();
    
            // Reset to today on double-click of title area
            if (
                event.dbl &&
                event.relY === this.sceneY + this.#offset.y + 1 &&
                event.relX > this.sceneX + this.#offset.x + 6 &&
                event.relX < this.sceneX + this.#offset.x + 37
            ) {
                this.setToday();
                this.render(true);
                return;
            }
    
            if (event.action === 'mousedown') {
                const navIndex = this.hoverNavs(event.relY, event.relX, false);
                if (navIndex !== null) {
                    const navAction = this.#nav_actions[navIndex];
                    if (navAction) {
                        const delta = navAction.delta;
                        if (navAction.type === 'month') {
                            this.changeMonth(delta);
                        } else if (navAction.type === 'year') {
                            this.changeYear(delta);
                        }
                    }
                }
                // Handle click on date cell
                const gridX = Math.floor((event.relX - this.sceneX - 1 - this.#offset.x) / 6);
                const gridY = Math.floor((event.relY - this.sceneY - 5 - this.#offset.y) / 2);
                
                if (gridX >= 0 && gridX < 7 && gridY >= 0 && gridY < 6) {
                    const cellIndex = gridY * 7 + gridX;
                    const fd = firstDay(this.state.year, this.state.month);
                    const day = cellIndex - fd + 1;
                    const ml = monthLength(this.state.year, this.state.month);

                    if (day >= 1 && day <= ml) {
                        this.state.selectedDay = day;
                        this.render(true);
                        this.sendAction?.({ type: 'date-selected', ...this.state });
                    }
                }
            }
        }
    
        if (event.button === 'none') {
            this.hoverNavs(event.relY, event.relX);
        }
    }
    
    handleKeyEvent(event) {
        
        let key = event.name
        // if (this.state.selectedDay == null) return;
        let dayDelta = 0;
        let weekDelta = 0;
        let monthDelta = 0;
        switch (key) {
            case 'left':    dayDelta--;  break;
            case 'right':   dayDelta++;  break;
            case 'up':      dayDelta-=7; break;
            case 'down':    dayDelta+=7; break;
            case 'pageup':
                monthDelta=-1;    
                break;
            case 'ctrl-pageup':
            case 'ctrl-up':
                weekDelta=-1;    
                break;
            case 'pagedown':
                monthDelta=1;
                break;
            case 'ctrl-pagedown':
            case 'ctrl-down':
                weekDelta=1;
                break;
            case 'home':
                this.setToday();
                this.render(true);
                return;
            
        }
        
        const ml = monthLength(this.state.year, this.state.month);
        if (dayDelta != 0)
            this.changeDay(dayDelta); 
        else if (weekDelta != 0) {
            this.changeWeek(weekDelta, true);
        } else if (monthDelta != 0) {
            this.changeMonth(monthDelta);
        }
    }
}

module.exports = DatePicker;