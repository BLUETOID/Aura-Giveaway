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
}

module.exports = ChartGenerator;
