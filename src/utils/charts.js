const QuickChart = require('quickchart-js');

class ChartGenerator {
  constructor() {
    this.chart = new QuickChart();
    this.chart.setWidth(800);
    this.chart.setHeight(400);
    this.chart.setBackgroundColor('transparent');
  }

  /**
   * Generate a line chart for messages and voice activity over time
   * @param {Array} weeklyData - Array of daily stats for the past 7 days
   * @returns {String} Chart URL
   */
  generateActivityChart(weeklyData) {
    const labels = weeklyData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const messageData = weeklyData.map(d => d.messages);
    const voiceData = weeklyData.map(d => Math.round(d.voiceMinutes / 60 * 10) / 10); // Convert to hours

    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Messages',
            data: messageData,
            borderColor: 'rgb(75, 192, 75)',
            backgroundColor: 'rgba(75, 192, 75, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Voice (hours)',
            data: voiceData,
            borderColor: 'rgb(192, 75, 192)',
            backgroundColor: 'rgba(192, 75, 192, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Server Activity - Last 7 Days',
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: true,
            labels: { color: '#fff', font: { size: 12 } }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff' }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff' },
            title: {
              display: true,
              text: 'Messages',
              color: 'rgb(75, 192, 75)'
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#fff' },
            title: {
              display: true,
              text: 'Voice Hours',
              color: 'rgb(192, 75, 192)'
            }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate a bar chart for member growth (joins vs leaves)
   * @param {Array} weeklyData - Array of daily stats for the past 7 days
   * @returns {String} Chart URL
   */
  generateMemberGrowthChart(weeklyData) {
    const labels = weeklyData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const joins = weeklyData.map(d => d.joins);
    const leaves = weeklyData.map(d => d.leaves);

    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Joins',
            data: joins,
            backgroundColor: 'rgba(75, 192, 75, 0.8)',
            borderColor: 'rgb(75, 192, 75)',
            borderWidth: 2
          },
          {
            label: 'Leaves',
            data: leaves,
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Member Growth - Last 7 Days',
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: true,
            labels: { color: '#fff', font: { size: 12 } }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff', stepSize: 1 },
            title: {
              display: true,
              text: 'Members',
              color: '#fff'
            }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate a combined overview chart with multiple metrics
   * @param {Array} weeklyData - Array of daily stats for the past 7 days
   * @returns {String} Chart URL
   */
  generateOverviewChart(weeklyData) {
    const labels = weeklyData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    const messages = weeklyData.map(d => d.messages);
    const netGrowth = weeklyData.map(d => d.joins - d.leaves);
    const maxOnline = weeklyData.map(d => d.maxOnline);

    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Messages',
            data: messages,
            borderColor: 'rgb(75, 192, 75)',
            backgroundColor: 'rgba(75, 192, 75, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Net Growth',
            data: netGrowth,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y1'
          },
          {
            label: 'Peak Online',
            data: maxOnline,
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          title: {
            display: true,
            text: 'Server Overview - Last 7 Days',
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: true,
            labels: { color: '#fff', font: { size: 12 } }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff' }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#fff' }
          },
          y2: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#fff' }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate a daily activity distribution chart
   * @param {Object} todayStats - Today's statistics
   * @returns {String} Chart URL
   */
  generateDailyChart(todayStats) {
    const labels = ['Joins', 'Leaves', 'Messages', 'Voice Hours'];
    const voiceHours = Math.round(todayStats.voiceMinutes / 60 * 10) / 10;
    
    const data = [
      todayStats.joins,
      todayStats.leaves,
      Math.round(todayStats.messages / 10), // Scale down messages for better visualization
      voiceHours
    ];

    const config = {
      type: 'polarArea',
      data: {
        labels: labels,
        datasets: [{
          label: 'Today\'s Activity',
          data: data,
          backgroundColor: [
            'rgba(75, 192, 75, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(192, 75, 192, 0.7)'
          ],
          borderColor: [
            'rgb(75, 192, 75)',
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(192, 75, 192)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Daily Activity Distribution - ${todayStats.date}`,
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: true,
            position: 'right',
            labels: { color: '#fff', font: { size: 12 } }
          }
        },
        scales: {
          r: {
            ticks: { color: '#fff', backdropColor: 'transparent' },
            grid: { color: 'rgba(255, 255, 255, 0.2)' },
            pointLabels: { color: '#fff' }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate a heat map for hourly activity patterns
   * @param {Array} heatMapData - 2D array [days][hours] with activity counts
   * @param {String} title - Chart title
   * @param {String} type - 'messages' or 'voice'
   * @returns {String} Chart URL
   */
  generateHeatMap(heatMapData, title = 'Activity Heat Map', type = 'messages') {
    // Prepare data for matrix chart
    const data = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get date labels for the past 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(dayLabels[date.getDay()]);
    }

    // Convert heat map data to chart format
    heatMapData.forEach((day, dayIndex) => {
      day.forEach((value, hourIndex) => {
        data.push({
          x: hourIndex,
          y: dayIndex,
          v: value
        });
      });
    });

    // Find max value for color scaling
    const maxValue = Math.max(...data.map(d => d.v), 1);

    const config = {
      type: 'matrix',
      data: {
        datasets: [{
          label: type === 'messages' ? 'Messages' : 'Voice Minutes',
          data: data,
          backgroundColor: (context) => {
            if (!context.raw) return 'rgba(200, 200, 200, 0.1)';
            const value = context.raw.v;
            const intensity = value / maxValue;
            
            if (type === 'messages') {
              // Green gradient for messages
              return `rgba(75, 192, 75, ${0.2 + intensity * 0.8})`;
            } else {
              // Purple gradient for voice
              return `rgba(192, 75, 192, ${0.2 + intensity * 0.8})`;
            }
          },
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderWidth: 1,
          width: ({ chart }) => (chart.chartArea || {}).width / 24 - 2,
          height: ({ chart }) => (chart.chartArea || {}).height / 7 - 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                const point = context[0].raw;
                const hour = point.x;
                const day = dates[point.y];
                return `${day} ${hour}:00`;
              },
              label: (context) => {
                const value = context.raw.v;
                return type === 'messages' 
                  ? `${value} messages` 
                  : `${Math.round(value)} voice minutes`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: -0.5,
            max: 23.5,
            ticks: {
              stepSize: 1,
              color: '#fff',
              callback: (value) => {
                if (value % 3 === 0) return `${value}:00`;
                return '';
              }
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            title: {
              display: true,
              text: 'Hour of Day',
              color: '#fff'
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            min: -0.5,
            max: 6.5,
            ticks: {
              stepSize: 1,
              color: '#fff',
              callback: (value) => dates[value] || ''
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            title: {
              display: true,
              text: 'Day of Week',
              color: '#fff'
            }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate an enhanced activity chart with gradient fill
   * @param {Array} weeklyData - Array of daily stats
   * @param {String} metric - 'messages', 'voice', or 'members'
   * @returns {String} Chart URL
   */
  generateEnhancedActivityChart(weeklyData, metric = 'messages') {
    const labels = weeklyData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    let data, color, label;
    
    switch (metric) {
      case 'voice':
        data = weeklyData.map(d => Math.round(d.voiceMinutes / 60 * 10) / 10);
        color = { r: 192, g: 75, b: 192 };
        label = 'Voice Hours';
        break;
      case 'members':
        data = weeklyData.map(d => d.joins - d.leaves);
        color = { r: 54, g: 162, b: 235 };
        label = 'Net Member Change';
        break;
      default:
        data = weeklyData.map(d => d.messages);
        color = { r: 75, g: 192, b: 75 };
        label = 'Messages';
    }

    const config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          borderColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
          backgroundColor: {
            type: 'linear',
            x0: 0,
            y0: 0,
            x1: 0,
            y1: 400,
            colorStops: [
              { offset: 0, color: `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)` },
              { offset: 1, color: `rgba(${color.r}, ${color.g}, ${color.b}, 0.0)` }
            ]
          },
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${label} - Last 7 Days`,
            font: { size: 20, weight: 'bold' },
            color: '#fff',
            padding: 20
          },
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${label}: ${value.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { 
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: { 
              color: '#fff',
              font: { size: 12 }
            }
          },
          y: {
            beginAtZero: true,
            grid: { 
              color: 'rgba(255, 255, 255, 0.1)',
              drawBorder: false
            },
            ticks: { 
              color: '#fff',
              font: { size: 12 }
            }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }

  /**
   * Generate a user activity profile chart
   * @param {Object} userData - User's activity data
   * @returns {String} Chart URL
   */
  generateUserProfileChart(userData) {
    const labels = ['Total', 'Monthly', 'Weekly', 'Daily'];
    const data = [
      userData.messages.total,
      userData.messages.monthly,
      userData.messages.weekly,
      userData.messages.daily
    ];

    const config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Messages',
          data: data,
          backgroundColor: [
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 99, 132, 0.8)'
          ],
          borderColor: [
            'rgb(255, 206, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 99, 132)'
          ],
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${userData.username}'s Message Activity`,
            font: { size: 18, weight: 'bold' },
            color: '#fff'
          },
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context) => `${context.parsed.y.toLocaleString()} messages`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { color: '#fff', font: { size: 12 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            ticks: { 
              color: '#fff',
              font: { size: 12 },
              callback: (value) => value.toLocaleString()
            }
          }
        }
      }
    };

    this.chart.setConfig(config);
    return this.chart.getUrl();
  }
}

module.exports = ChartGenerator;
