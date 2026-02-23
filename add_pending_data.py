import sqlite3
import json
from pathlib import Path

# Sample pending laboratory submissions for admin testing
pending_labs = [
    {
        'lab_name': 'Mauritanian Traditional Medicine Center',
        'institution_name': 'University of Nouakchott',
        'contact_person': 'Dr. Ahmed Ould Mohamed',
        'contact_email': 'ahmed.mohamed@univ-nkc.mr',
        'phone': '+222 45 123 456',
        'website': 'https://www.univ-nkc.mr',
        'coordinates_lat': 18.0735,
        'coordinates_lng': -15.9582,
        'address': 'University Campus, Nouakchott',
        'city': 'Nouakchott',
        'country': 'Mauritania',
        'research_areas': json.dumps(['traditional-medicine', 'desert-plants', 'ethnobotany']),
        'description': 'Research center dedicated to studying traditional Mauritanian medicinal practices and desert flora with therapeutic properties.',
        'established_year': 2010,
        'approved': 0  # Pending approval
    },
    {
        'lab_name': 'Sudanese Natural Products Laboratory',
        'institution_name': 'University of Khartoum',
        'contact_person': 'Prof. Fatima Al-Bashir',
        'contact_email': 'f.albashir@uofk.edu',
        'phone': '+249 11 123 456',
        'website': 'https://www.uofk.edu',
        'coordinates_lat': 15.5007,
        'coordinates_lng': 32.5599,
        'address': 'Faculty of Pharmacy, University of Khartoum',
        'city': 'Khartoum',
        'country': 'Sudan',
        'research_areas': json.dumps(['natural-products', 'antimalarial', 'pharmacokinetics']),
        'description': 'Advanced laboratory focusing on isolation and development of antimalarial compounds from Sudanese medicinal plants.',
        'established_year': 1998,
        'approved': 0  # Pending approval
    },
    {
        'lab_name': 'Algerian Aromatherapy Research Lab',
        'institution_name': 'University of Constantine',
        'contact_person': 'Dr. Nadia Benhadj',
        'contact_email': 'nadia.benhadj@univ-constantine2.dz',
        'phone': '+213 31 123 456',
        'website': 'https://www.univ-constantine2.dz',
        'coordinates_lat': 36.3650,
        'coordinates_lng': 6.6147,
        'address': 'Department of Chemistry, Constantine',
        'city': 'Constantine',
        'country': 'Algeria',
        'research_areas': json.dumps(['aromatherapy', 'essential-oils', 'volatile-compounds']),
        'description': 'Specialized research facility for essential oil extraction, analysis, and therapeutic application studies from Algerian aromatic plants.',
        'established_year': 2005,
        'approved': 0  # Pending approval
    }
]

def add_pending_data():
    db_path = Path('server/database/labs.db')
    
    if not db_path.exists():
        print("Database file does not exist. Please start the server first to create the database.")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='labs'")
        if not cursor.fetchone():
            print("Labs table does not exist. Please start the server first to create the database schema.")
            return
        
        # Insert pending lab data
        insert_query = '''
        INSERT INTO labs (
            lab_name, institution_name, contact_person, contact_email, 
            phone, website, address, city, country, coordinates_lat, 
            coordinates_lng, research_areas, description, established_year, approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        
        for lab in pending_labs:
            cursor.execute(insert_query, (
                lab['lab_name'], lab['institution_name'], lab['contact_person'], 
                lab['contact_email'], lab['phone'], lab.get('website'), 
                lab['address'], lab['city'], lab['country'],
                lab['coordinates_lat'], lab['coordinates_lng'], 
                lab['research_areas'], lab['description'], lab['established_year'], lab['approved']
            ))
        
        conn.commit()
        print(f"Successfully added {len(pending_labs)} pending laboratory submissions!")
        
        # Verify the data was added
        cursor.execute("SELECT COUNT(*) FROM labs WHERE approved = 0")
        pending_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM labs WHERE approved = 1")
        approved_count = cursor.fetchone()[0]
        
        print(f"Pending submissions: {pending_count}")
        print(f"Approved labs: {approved_count}")
        print(f"Total labs: {pending_count + approved_count}")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_pending_data()