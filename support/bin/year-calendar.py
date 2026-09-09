from datetime import datetime, timedelta, date

"""
Program to Enumerate Week Numbers, Start and End Dates for a Given Year, 
and Associate Each Week Number with a Virtue Name from `virtues_map`.
"""

virtues_map = {
    1: "Evaluatio",
    2: "Efficacia",
    3: "Illuminatio",
    4: "Sapientia",
    5: "Compassio",
    6: "Poenitentia",
    7: "Momento Mori",
    8: "Silentium",
    9: "Temperantia",
    10: "Caritas",
    11: "Magnanimitas",
    12: "Transcendendum",
    13: "Simplicitas",
    14: "Humilitas",
    15: "Rectitudo",
    16: "Adaptatio",
    17: "Incrementum",
    18: "Stabilitas",
    19: "Vivere",
    20: "Observatio",
    21: "Constantia",
    22: "Exploratio",
    23: "Curiositas",
    24: "Fortitudo",
    25: "Veritas",
    26: "Virtus",
    27: "Harmonia",
    28: "Integritas",
    29: "Disciplina",
    30: "Gratia",
    31: "Lumen",
    32: "Praxis",
    33: "Meditatio",
    34: "Eudaimonia",
    35: "Arete",
    36: "Benevolentia",
    37: "Sinceritas",
    38: "Diligentia",
    39: "Ethos",
    40: "Resilientia",
    41: "Philia",
    42: "Eleutheria",
    43: "Aionios",
    44: "Resurgo",
    45: "Benignitas",
    46: "Pietas",
    47: "Spes",
    48: "Laborio",
    49: "Justitia",
    50: "Moderatio",
    51: "Prudentia",
    52: "Claritas",
    53: "Reflexio"
}


def enumerate_weeks(year):
    """
      Note: Generated with chatgpt; improve it's structure; to aid understanding.
      return structure {
          <weak number>: (<start date>,  <end date>)
      }
    """
    # Get the first day of the year
    start_date = datetime(year, 1, 1)
    data  = {}
    
    # Calculate the first Monday (start of the first week)
    if start_date.weekday() != 0:
        start_date += timedelta(days=(7 - start_date.weekday()))
    
    week_number = 1
    
    while start_date.year == year:
        end_date = start_date + timedelta(days=6)
        
        # Ensure the end date doesn't extend beyond the year
        if end_date.year > year:
            end_date = datetime(year, 12, 31)
        
        data[week_number] = (start_date, end_date)
        # print(f"Week {week_number}: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        week_number += 1
        start_date += timedelta(weeks=1)
    return data


data  =  enumerate_weeks(2025)
# print(data)
for idx_month,value  in data.items():
    # idx_month =  key + 1
    start = data[idx_month][0]
    end = data[idx_month][1]
    print(idx_month, virtues_map[idx_month], start, end)
