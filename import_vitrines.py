import os, uuid
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("ERREUR: Variables manquantes")
    exit(1)

from supabase import create_client
supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

ARTISANS = [
  {"nom": "ARTISAN ROBERT", "siret": "99377293800011", "adresse": "58 RUE DE MONCEAU, 75008 PARIS", "code_postal": "75008", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8748, "longitude": 2.307},
  {"nom": "ATOUT SERVICE PLUS", "siret": "44972740300015", "adresse": "99 RUE DE SEVRES, 75006 PARIS", "code_postal": "75006", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8496, "longitude": 2.334},
  {"nom": "ALARMES COFFRES SECURITE", "siret": "40298833100011", "adresse": "11 RUE MESNIL, 75016 PARIS", "code_postal": "75016", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8638, "longitude": 2.2726},
  {"nom": "STRATEL AES", "siret": "35335675100019", "adresse": "24 RUE DE LIEGE, 75008 PARIS", "code_postal": "75008", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8748, "longitude": 2.307},
  {"nom": "ARTISANAT SERVICES", "siret": "48054958300114", "adresse": "101 RUE DE SEVRES, 75006 PARIS", "code_postal": "75006", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8496, "longitude": 2.334},
  {"nom": "EPS COORDINATION", "siret": "37811081100015", "adresse": "131 BOULEVARD CARNOT, 78110 LE VESINET", "code_postal": "78110", "ville": "LE VESINET", "metiers": ["Électricien"], "latitude": 48.8974, "longitude": 2.1206},
  {"nom": "PX-CIE", "siret": "90890730600058", "adresse": "242 BOULEVARD VOLTAIRE, 75011 PARIS", "code_postal": "75011", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8589, "longitude": 2.3787},
  {"nom": "SOC ELECTRICITE BATIMENT INDUSTRIE", "siret": "33036777200044", "adresse": "56 BOULEVARD PEREIRE, 75017 PARIS", "code_postal": "75017", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8862, "longitude": 2.3178},
  {"nom": "AUSTRAL SOLAR FRANCE", "siret": "94860755100017", "adresse": "47 BOULEVARD DE COURCELLES, 75008 PARIS", "code_postal": "75008", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8748, "longitude": 2.307},
  {"nom": "ARTISANS MULTISERVICES", "siret": "42221948300061", "adresse": "17 RUE DES DAMES, 75017 PARIS", "code_postal": "75017", "ville": "PARIS", "metiers": ["Électricien"], "latitude": 48.8862, "longitude": 2.3178},
  {"nom": "CENTRALE ASSISTANCE DEPANNAGE", "siret": "30735190800062", "adresse": "34 RUE DE LA FEDERATION, 75016 PARIS", "code_postal": "75016", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8638, "longitude": 2.2726},
  {"nom": "ARTISAN BERTRAND", "siret": "38074697000038", "adresse": "12 RUE DE CHARENTON, 75012 PARIS", "code_postal": "75012", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8412, "longitude": 2.3893},
  {"nom": "FRANCE HABITAT EXPERTS", "siret": "48268091200056", "adresse": "3 RUE DE CHAZELLES, 92200 NEUILLY-SUR-SEINE", "code_postal": "92200", "ville": "NEUILLY-SUR-SEINE", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8848, "longitude": 2.2686},
  {"nom": "AUX SERVICES REUNIS", "siret": "31274568900046", "adresse": "4 RUE DE LA COSSONNERIE, 75001 PARIS", "code_postal": "75001", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8606, "longitude": 2.3477},
  {"nom": "ETABLISSEMENT CHARLES", "siret": "41432568700028", "adresse": "6 RUE EDOUARD MANET, 75013 PARIS", "code_postal": "75013", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8317, "longitude": 2.3607},
  {"nom": "ATELIER LEGROS", "siret": "43993652900030", "adresse": "14 RUE DE NEMOURS, 75010 PARIS", "code_postal": "75010", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8752, "longitude": 2.3607},
  {"nom": "DITECO", "siret": "38282985800026", "adresse": "6 RUE DE JOINVILLE, 75019 PARIS", "code_postal": "75019", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8848, "longitude": 2.3777},
  {"nom": "ARTISAN BRUNO", "siret": "38932876400024", "adresse": "15 RUE DE CONDE, 75006 PARIS", "code_postal": "75006", "ville": "PARIS", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8496, "longitude": 2.334},
  {"nom": "BAUDOYER PERE ET FILS", "siret": "38212638900015", "adresse": "3 AVENUE DE PARIS, 94300 VINCENNES", "code_postal": "94300", "ville": "VINCENNES", "metiers": ["Plombier", "Chauffagiste"], "latitude": 48.8476, "longitude": 2.4395},
  {"nom": "ETABLISSEMENT FONTAINE PERE ET FILS", "siret": "39182756300021", "adresse": "12 RUE FONDAUDEGE, 33300 BORDEAUX", "code_postal": "33300", "ville": "BORDEAUX", "metiers": ["Plombier", "Chauffagiste"], "latitude": 44.8378, "longitude": -0.5792},
  {"nom": "REMY GARNIER SA", "siret": "32694491500031", "adresse": "15 RUE DU FAUBOURG SAINT-ANTOINE, 75012 PARIS", "code_postal": "75012", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8412, "longitude": 2.3893},
  {"nom": "BRONZES DE FRANCE", "siret": "32268942500042", "adresse": "24 RUE DE CHARONNE, 75012 PARIS", "code_postal": "75012", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8412, "longitude": 2.3893},
  {"nom": "THE KEYS", "siret": "82439024900012", "adresse": "7 AVENUE DU GENERAL DE GAULLE, 94160 SAINT-MANDE", "code_postal": "94160", "ville": "SAINT-MANDE", "metiers": ["Serrurier"], "latitude": 48.8411, "longitude": 2.4199},
  {"nom": "DAPLE GBALET", "siret": "39179199300036", "adresse": "5 RUE DU FAUBOURG SAINT-ANTOINE, 75012 PARIS", "code_postal": "75012", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8412, "longitude": 2.3893},
  {"nom": "MEUNIER ET FILS", "siret": "31967235800015", "adresse": "8 RUE DE LA ROQUETTE, 75011 PARIS", "code_postal": "75011", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8589, "longitude": 2.3787},
  {"nom": "LA SERRURERIE D ART", "siret": "38936741200018", "adresse": "2 RUE DE L EGLISE, 49290 MAUGES-SUR-LOIRE", "code_postal": "49290", "ville": "MAUGES-SUR-LOIRE", "metiers": ["Serrurier"], "latitude": 47.3568, "longitude": -1.0843},
  {"nom": "SEGMA", "siret": "39482763500022", "adresse": "12 RUE DE PARIS, 77600 BUSSY-SAINT-MARTIN", "code_postal": "77600", "ville": "BUSSY-SAINT-MARTIN", "metiers": ["Serrurier"], "latitude": 48.9285, "longitude": 2.7892},
  {"nom": "LA CLE RAPIDE", "siret": "38836204100014", "adresse": "5 AVENUE DU PRESIDENT KENNEDY, 78400 CHATOU", "code_postal": "78400", "ville": "CHATOU", "metiers": ["Serrurier"], "latitude": 48.8879, "longitude": 2.1542},
  {"nom": "AUX SPECIALISTES DE LA CLE", "siret": "39284756100019", "adresse": "22 RUE DES MARTYRS, 75009 PARIS", "code_postal": "75009", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8766, "longitude": 2.3358},
  {"nom": "HENRI SUZEN", "siret": "38129847600011", "adresse": "18 RUE DE MONCEAU, 75008 PARIS", "code_postal": "75008", "ville": "PARIS", "metiers": ["Serrurier"], "latitude": 48.8748, "longitude": 2.307},
  {"nom": "EURO BATIMENT", "siret": "38274856900022", "adresse": "12 RUE DE LA GRANGE AUX BELLES, 75010 PARIS", "code_postal": "75010", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8752, "longitude": 2.3607},
  {"nom": "ETABLISSEMENTS BERNIER PERE ET FILS", "siret": "38291847500016", "adresse": "8 RUE DU GENERAL DE GAULLE, 94160 SAINT-MANDE", "code_postal": "94160", "ville": "SAINT-MANDE", "metiers": ["Vitrier"], "latitude": 48.8411, "longitude": 2.4199},
  {"nom": "ABRAHAM PERE ET FILS", "siret": "38475629100013", "adresse": "3 RUE DU CHATEAU D EAU, 75010 PARIS", "code_postal": "75010", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8752, "longitude": 2.3607},
  {"nom": "S.P. BATIMENT", "siret": "38927465100011", "adresse": "42 RUE DE COURCELLES, 75008 PARIS", "code_postal": "75008", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8748, "longitude": 2.307},
  {"nom": "MCV BAT", "siret": "39274856100018", "adresse": "17 RUE ORDENER, 75018 PARIS", "code_postal": "75018", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8924, "longitude": 2.3444},
  {"nom": "ATELIER CAMUSET", "siret": "39182756400023", "adresse": "14 RUE DE GRENELLE, 75007 PARIS", "code_postal": "75007", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8566, "longitude": 2.312},
  {"nom": "FERNANDO DA PIEDADE", "siret": "39274568100015", "adresse": "9 RUE CHAMPIONNET, 75018 PARIS", "code_postal": "75018", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8924, "longitude": 2.3444},
  {"nom": "SALKY EXPRESS", "siret": "39182647500020", "adresse": "24 RUE DES MAZIERES, 91000 EVRY-COURCOURONNES", "code_postal": "91000", "ville": "EVRY-COURCOURONNES", "metiers": ["Vitrier"], "latitude": 48.6239, "longitude": 2.4378},
  {"nom": "MON CONCEPT HABITATION", "siret": "39274856200019", "adresse": "6 RUE BEAUREPAIRE, 75010 PARIS", "code_postal": "75010", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8752, "longitude": 2.3607},
  {"nom": "JULIAN ENTREPRISE GENERALE DE PEINTURE", "siret": "39182756500022", "adresse": "3 RUE DES POISSONNIERS, 75018 PARIS", "code_postal": "75018", "ville": "PARIS", "metiers": ["Vitrier"], "latitude": 48.8924, "longitude": 2.3444},
]

print(f"Insertion de {len(ARTISANS)} profils vitrines...")
success = 0
errors = 0

for a in ARTISANS:
    try:
        row = {
            "id": str(uuid.uuid4()),
            "nom": a["nom"],
            "prenom": None,
            "metier": a["metiers"],
            "ville": a["ville"],
            "adresse": a["adresse"],
            "code_postal": a["code_postal"],
            "siret": a["siret"],
            "latitude": a["latitude"],
            "longitude": a["longitude"],
            "type": "vitrine",
            "statut_verification": "non_verifie",
            "plan_actif": "aucun",
            "actif": True,
            "note_moyenne": None,
            "nombre_avis": 0,
            "telephone": None,
            "photo_url": None,
            "bio": None,
            "zone_intervention_km": 20,
        }
        supabase.table("profiles_artisans").insert(row).execute()
        print(f"  ok {a['nom'][:45]}")
        success += 1
    except Exception as e:
        print(f"  ERR {a['nom'][:45]} -- {e}")
        errors += 1

print(f"\nSucces: {success}/{len(ARTISANS)}, Erreurs: {errors}")
