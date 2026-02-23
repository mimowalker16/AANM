import sqlite3
import json
from pathlib import Path

# Sample laboratory data for demonstration
sample_labs = [
    {
        'lab_name': 'Institute of Natural Medicine Research',
        'institution_name': 'University of Algiers',
        'contact_person': 'Dr. Amina Benali',
        'contact_email': 'research@univ-alger.dz',
        'phone': '+213 21 123 456',
        'website': 'https://www.univ-alger.dz',
        'coordinates_lat': 36.7538,
        'coordinates_lng': 3.0588,
        'address': '2 Rue Didouche Mourad, Algiers',
        'city': 'Algiers',
        'country': 'Algeria',
        'research_areas': json.dumps(['medicinal-plants', 'pharmacology', 'toxicology']),
        'description': 'Leading research center focusing on traditional North African medicinal plants and their therapeutic applications.',
        'established_year': 1985,
        'approved': 1
    },
    {
        'lab_name': 'Moroccan Center for Phytotherapy',
        'institution_name': 'Mohammed V University',
        'contact_person': 'Prof. Hassan El Rhazi',
        'contact_email': 'phyto@um5.ac.ma',
        'phone': '+212 5 37 123 456',
        'website': 'https://www.um5.ac.ma',
        'coordinates_lat': 34.0209,
        'coordinates_lng': -6.8416,
        'address': 'Avenue Ibn Battouta, Rabat',
        'city': 'Rabat',
        'country': 'Morocco',
        'research_areas': json.dumps(['phytotherapy', 'essential-oils', 'clinical-trials']),
        'description': 'Specialized laboratory for phytotherapy research and clinical validation of traditional Moroccan remedies.',
        'established_year': 1992,
        'approved': 1
    },
    {
        'lab_name': 'Tunis Institute of Pharmacognosy',
        'institution_name': 'University of Tunis El Manar',
        'contact_person': 'Dr. Leila Chekir-Ghedira',
        'contact_email': 'pharmacog@utm.tn',
        'phone': '+216 71 123 456',
        'website': 'https://www.utm.tn',
        'coordinates_lat': 36.8065,
        'coordinates_lng': 10.1815,
        'address': 'Campus Universitaire, Tunis',
        'city': 'Tunis',
        'country': 'Tunisia',
        'research_areas': json.dumps(['pharmacognosy', 'natural-products', 'drug-discovery']),
        'description': 'Research facility dedicated to the study of natural products and drug discovery from Mediterranean flora.',
        'established_year': 1978,
        'approved': 1
    },
    {
        'lab_name': 'Libya Natural Medicine Laboratory',
        'institution_name': 'University of Tripoli',
        'contact_person': 'Dr. Omar Al-Magrabi',
        'contact_email': 'natmed@uot.edu.ly',
        'phone': '+218 21 123 456',
        'website': 'https://www.uot.edu.ly',
        'coordinates_lat': 32.8872,
        'coordinates_lng': 13.1913,
        'address': 'University Campus, Tripoli',
        'city': 'Tripoli',
        'country': 'Libya',
        'research_areas': json.dumps(['traditional-medicine', 'antimicrobial', 'wound-healing']),
        'description': 'Laboratory focusing on traditional Libyan medicinal practices and antimicrobial natural compounds.',
        'established_year': 1995,
        'approved': 1
    },
    {
        'lab_name': 'Cairo Herbal Research Center',
        'institution_name': 'Cairo University',
        'contact_person': 'Prof. Mahmoud El-Sissi',
        'contact_email': 'herbs@cu.edu.eg',
        'phone': '+20 2 123 456 789',
        'website': 'https://www.cu.edu.eg',
        'coordinates_lat': 30.0444,
        'coordinates_lng': 31.2357,
        'address': 'Faculty of Pharmacy, Kasr El Aini Street',
        'city': 'Cairo',
        'country': 'Egypt',
        'research_areas': json.dumps(['herbal-medicine', 'quality-control', 'standardization']),
        'description': 'Premier Egyptian facility for herbal medicine research and standardization of medicinal plant preparations.',
        'established_year': 1965,
        'approved': 1
    },
    {
        'lab_name': 'Casablanca Bioactive Compounds Lab',
        'institution_name': 'Hassan II University',
        'contact_person': 'Dr. Fatima Zahra Kabbaj',
        'contact_email': 'bioactive@univh2c.ma',
        'phone': '+212 5 22 123 456',
        'website': 'https://www.univh2c.ma',
        'coordinates_lat': 33.5731,
        'coordinates_lng': -7.5898,
        'address': 'Faculty of Sciences, Casablanca',
        'city': 'Casablanca',
        'country': 'Morocco',
        'research_areas': json.dumps(['bioactive-compounds', 'antioxidants', 'nutraceuticals']),
        'description': 'Research laboratory specializing in isolation and characterization of bioactive compounds from North African plants.',
        'established_year': 2001,
        'approved': 1
    }
]

def add_sample_data():
    db_path = Path('server/database/labs.db')
    
    if not db_path.exists():
        print("Database file does not exist. Please start the server first to create the database.")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if table exists and has the correct structure
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='labs'")
        if not cursor.fetchone():
            print("Labs table does not exist. Please start the server first to create the database schema.")
            return
        
        # Clear existing data (optional)
        cursor.execute("DELETE FROM labs")
        
        # Insert sample data
        insert_query = '''
        INSERT INTO labs (
            lab_name, institution_name, contact_person, contact_email, 
            phone, website, address, city, country, coordinates_lat, 
            coordinates_lng, research_areas, description, established_year, approved
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        '''
        
        for lab in sample_labs:
            cursor.execute(insert_query, (
                lab['lab_name'], lab['institution_name'], lab['contact_person'], 
                lab['contact_email'], lab['phone'], lab.get('website'), 
                lab['address'], lab['city'], lab['country'],
                lab['coordinates_lat'], lab['coordinates_lng'], 
                lab['research_areas'], lab['description'], lab['established_year'], lab['approved']
            ))
        
        conn.commit()
        print(f"Successfully added {len(sample_labs)} sample laboratories to the database!")
        
        # Verify the data was added
        cursor.execute("SELECT COUNT(*) FROM labs WHERE approved = 1")
        count = cursor.fetchone()[0]
        print(f"Total approved labs in database: {count}")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_sample_data()