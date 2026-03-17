import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const INDIAN_CITIES = [
  "Abhayapuri", "Achabbal", "Achhnera", "Adalaj", "Adari", "Adilabad", "Adityana", "Adoni", "Adoor", "Adra",
  "Agartala", "Agra", "Ahmedabad", "Ahmedgarh", "Ahmednagar", "Ahiwara", "Aizawl", "Akaltara", "Akathiyoor", "Akhnoor",
  "Akola", "Alang", "Alappuzha", "Aldona", "Aligarh", "Alipurduar", "Allahabad", "Almora", "Along", "Alwar",
  "Amadalavalasa", "Amalapuram", "Amarpur", "Ambaji", "Ambagarh Chowki", "Ambala", "Ambaliyasan", "Ambikapur", "Amguri", "Amlabad",
  "Amli", "Amravati", "Amreli", "Amroha", "Amritsar", "Anakapalle", "Anand", "Anandnagaar", "Anandapur", "Anantapur",
  "Anantnag", "Ancharakandy", "Andada", "Anjar", "Anklav", "Anugul", "Antaliya", "Ara", "Arakkonam", "Arambagh",
  "Arambhada", "Arang", "Araria", "Arasikere", "Arcot", "Areraj", "Arki", "Arnia", "Aroor", "Arrah",
  "Arruppukkottai", "Asansol", "Asarganj", "Asika", "Asola", "Assandh", "Ateli", "Atul", "Aurangabad", "Aurangabad",
  "Awantipora", "Azamgarh", "Baddi", "Bade Bacheli", "Badepalle", "Badharghat", "Bagaha", "Bahadurgarh", "Bahadurganj", "Baharampur",
  "Bahraich", "Bairgania", "Bakhtiarpur", "Balaghat", "Balangir", "Baleshwar", "Bali", "Ballabhgarh", "Ballia", "Balod",
  "Baloda Bazar", "Balrampur", "Balurghat", "Bamra", "Banda", "Bandikui", "Bandipore", "Bangalore", "Banganapalle", "Banka",
  "Bankura", "Banmankhi Bazar", "Banswara", "Bapatla", "Barakar", "Baramati", "Baramula", "Baran", "Barasat", "Barahiya",
  "Bardhaman", "Bareilly", "Bargarh", "Barh", "Barbil", "Baripada", "Barmer", "Barnala", "Barpeta", "Barpeta Road",
  "Barughutu", "Barwala", "Basudebpur", "Batala", "Bathinda", "Bazpur", "Begusarai", "Behea", "Belgaum", "Bellampalle",
  "Bellary", "Belpahar", "Bemetra", "Betul", "Bethamcherla", "Bettiah", "Bhabua", "Bhadrachalam", "Bhadrak", "Bhagha Purana",
  "Bhagalpur", "Bhainsa", "Bharatpur", "Bharuch", "Bhatapara", "Bhavani", "Bhavnagar", "Bhawanipatna", "Bheemunipatnam", "Bhimavaram",
  "Bhiwani", "Bhongir", "Bhopal", "Bhuban", "Bhubaneswar", "Bhuj", "Bikarner", "Bikramganj", "Bilasipara", "Bilaspur",
  "Bilaspur", "Biramitrapur", "Birgaon", "Bobbili", "Bodh Gaya", "Bodhan", "Bokaro Steel City", "Bomdila", "Bongaigaon", "Brahmapur",
  "Brajrajnagar", "Budhlada", "Burhanpur", "Buxar", "Byasanagar", "Calcutta", "Cambay", "Chaisbasa", "Chakradharpur", "Chalakudy",
  "Chalisgaon", "Chamba", "Chamba", "Chamba", "Champhai", "Chamrajnagar", "Champa", "Chandan Bara", "Chandausi", "Chandigarh",
  "Chandrapura", "Changanassery", "Chanpatia", "Charkhi Dadri", "Chatra", "Cheeka", "Chengalpattu", "Chennai", "Cherthala", "Chhapra",
  "Chhatarpur", "Chikkaballapur", "Chilakaluripet", "Chinchani", "Chinna salem", "Chintamani", "Chirala", "Chirkunda", "Chirmiri", "Chitradurga",
  "Chittur-Thathamangalam", "Chockli", "Chittoor", "Churi", "Coimbatore", "Colgong", "Contai", "Cooch Behar", "Coonoor", "Cuddalore",
  "Cuddapah", "Curchorem Cacora", "Cuttack", "Dabra", "Dadri", "Dahod", "Dalhousie", "Dalli-Rajhara", "Dalsinghsarai", "Daltonganj",
  "Daman and Diu", "Darbhanga", "Darjeeling", "Dasua", "Datia", "Daudnagar", "Davanagere", "Debagarh", "Deesa", "Dehradun",
  "Dehri-on-Sone", "Delhi", "Deoria", "Devgarh", "Dewas", "Dhaka", "Dhamtari", "Dhar", "Dharampur", "Dharmanagar",
  "Dharmapuri", "Dharamsala", "Dharmavaram", "Dharwad", "Dhekiajuli", "Dhenkanal", "Dholka", "Dhule", "Dhuri", "Dhubri",
  "Dibrugarh", "Digboi", "Dighwara", "Dimapur", "Dinanagar", "Dindigul", "Diphu", "Dipka", "Dispur", "Dombivli",
  "Dongargarh", "Dumka", "Dumraon", "Durgapur", "Durg-Bhilai Nagar", "Eluru", "Ellenabad 2", "Erattupetta", "Erode", "Etawah",
  "Faridabad", "Faridkot", "Farooqnagar", "Fatehabad", "Fatehabad", "Fatehabad", "Fatehpur", "Fatehpur", "Fatehpur", "Fatwah",
  "Fazilka", "Firozpur", "Firozpur Cantt.", "Forbesganj", "Gadag", "Gadwal", "Ganaur", "Gandhinagar", "Gangtok", "Garhwa",
  "Gauripur", "Gaya", "Gharaunda", "Ghatshila", "Ghaziabad", "Giddarbaha", "Giridih", "Goa", "Goalpara", "Gobindgarh",
  "Gobranawapara", "Godda", "Godhra", "Gogri Jamalpur", "Gohana", "Golaghat", "Gomoh", "Gooty", "Gopalganj", "Gudalur",
  "Gudivada", "Gudur", "Gulbarga", "Gumia", "Gumla", "Gundlupet", "Guntakal", "Guntur", "Gunupur", "Gurdaspur",
  "Gurgaon", "Guruvayoor", "Guwahati", "Gwalior", "Haflong", "Haibat(Yamuna Nagar)", "Hailakandi", "Hajipur", "Haldia", "Haldwani",
  "Hamirpur", "Hamirpur", "Hansi", "Hanuman Junction", "Hardoi", "Haridwar", "Hassan", "Hazaribag", "Hilsa", "Himatnagar",
  "Hindupur", "Hinjilicut", "Hisar", "Hisua", "Hodal", "Hojai", "Hoshangabad", "Hoshiarpur", "Hospet", "Howrah",
  "Hubli", "Hussainabad", "Hyderabad", "Ichalkaranji", "Ichchapuram", "Idar", "Imphal", "Indore", "Indranagar", "Irinjalakuda",
  "Islampur", "Islampur", "Islampur", "Itanagar", "Itarsi", "Jabalpur", "Jagatsinghapur", "Jagdispur", "Jaggaiahpet", "Jagtial",
  "Jagraon", "Jaitu", "Jajapur", "Jajmau", "Jalaleswar", "Jalalabad", "Jalandhar", "Jalandhar Cantt.", "Jalna", "Jalgaon",
  "Jamalpur", "Jammalamadugu", "Jammu", "Jamnagar", "Jamshedpur", "Jamtara", "Jamui", "Jandiala", "Jangaon", "Janjgir",
  "Jashpurnagar", "Jaspur", "Jatani", "Jaunpur", "Jehanabad", "Jeypur", "Jhajha", "Jhajjar", "Jhalawar", "Jhanjharpur",
  "Jhargram", "Jhansi", "Jharsuguda", "Jhumri Tilaiya", "Jind", "Joda", "Jogabani", "Jogendranagar", "Jodhpur", "Jorhat",
  "Jowai", "Junagadh", "Kadapa", "Kadi", "Kadirur", "Kadiri", "Kagaznagar", "Kailasahar", "Kaithal", "Kakching",
  "Kakinada", "Kalavad", "Kalan Wali", "Kalol", "Kalol", "Kalpi", "Kalpetta", "Kalyan", "Kalyandurg", "Kamareddy",
  "Kanchipuram", "Kandukur", "Kanhangad", "Kanjikkuzhi", "Kanker", "Kannur", "Kanpur", "Kantabanji", "Kanti", "Kapadvanj",
  "Kapurthala", "Karaikal", "Karaikudi", "Karanjia", "Karimganj", "Karimnagar", "Karjan", "Karkala", "Karnal", "Karoran",
  "Kartarpur", "Karungal", "Karur", "Karwar", "Kasaragod", "Kashipur", "Katihar", "Katni", "Kavali", "Kavaratti",
  "Kawardha", "Kayamkulam", "Kendrapara", "Kendujhar", "Keshod", "Khagaria", "Khambhalia", "Khambhat", "Khammam", "Khanna",
  "Kharagpur", "Kharagpur", "Kharar", "Kheda", "Khedbrahma", "Kheralu", "Khunti", "kichha", "Kishanganj", "Kochi",
  "Kodinar", "Kodungallur", "Kohima", "Kolar", "Kolhapur", "Kolkata", "Kollam", "Kollankodu", "Kondagaon", "Koothuparamba",
  "Koratla", "Koraput", "Korba", "Kota", "Kota", "Kota", "Kot Kapura", "Kothagudem", "Kothamangalam", "Kothapeta",
  "Kotdwara", "Kotma", "Kottayam", "Kovvur", "Kozhikode", "Kunnamkulam", "Kurali", "Kurnool", "Kyathampalle", "Lachhmangarh",
  "Ladnu", "Ladwa", "Lahar", "Laharpur", "Lakheri", "Lakhimpur", "Lakhisarai", "Lakshmeshwar", "Lalgudi", "Lalitpur",
  "Lal Gopalganj Nindaura", "Lalganj", "Lalganj", "Lalsot", "Lanka", "Lar", "Lathi", "Latur", "Leh", "Lilong",
  "Limbdi", "Lingsugur", "Loha", "Lohardaga", "Lonar", "Lonavla", "Longowal", "Loni", "Losal", "Lucknow",
  "Ludhiana", "Lumding", "Lunawada", "Lundi", "Lunglei", "Macherla", "Machilipatnam", "Madanapalle", "Maddur", "Madgaon",
  "Madhepura", "Madhugiri", "Madhubani", "Madhupur", "Madikeri", "Madurai", "Magadi", "Mahad", "Mahalingpur", "Maharajganj",
  "Maharajpur", "Mahasamund", "Mahbubnagar", "Mahe", "Mahendragarh", "Mahendragarh", "Mahesana", "Mahidpur", "Mahnar Bazar", "Mahuli",
  "Mahuva", "Maihar", "Mainaguri", "Makhdumpur", "Makrana", "Mal", "Malajkhand", "Malavalli", "Malegaon", "Malerkotla",
  "Malkangiri", "Malkapur", "Malout", "Malpura", "Malur", "Manavadar", "Manawar", "Manchar", "Mancherial", "Mandalgarh",
  "Mandamarri", "Mandapeta", "Mandawa", "Mandi", "Mandi Dabwali", "Mandideep", "Mandla", "Mandvi", "Mandya", "Maner",
  "Mangaldoi", "Mangalvedhe", "Manglaur", "Mangalore", "Mangrol", "Mangrol", "Mangrulpir", "Manihari", "Manjlegaon", "Mankachar",
  "Manmad", "Mansa", "Mansa", "Mansa", "Manuguru", "Manvi", "Manwath", "Mapusa", "Margao", "Margherita",
  "Marhaura", "Mariani", "Marigaon", "Markapur", "Marmagao", "Masaurhi", "Mathabhanga", "Mathura", "Mattannur", "Mauganj",
  "Maur", "Mavelikkara", "Mavoor", "Mayang Imphal", "Medak", "Medinipur", "Meerut", "Mehkar", "Mehmedabad", "Memari",
  "Merta city", "Mhaswad", "Mhow Cantonment", "Mhowgaon", "Mihijam", "Miraj", "Mirganj", "Miryalaguda", "Modasa", "Modinagar",
  "Moga", "Mogalthur", "Mohali", "Mokameh", "Mokokchung", "Monoharpur", "Moradabad", "Morena", "Morinda", "Morshi",
  "Morvi", "Motihari", "Motipur", "Mount Abu", "Mudalgi", "Mudbidri", "Muddebihal", "Mudhol", "Mukhed", "Mukerian",
  "Muktsar", "Mul", "Mulbagal", "Multai", "Mumbai", "Mundargi", "Mungeli", "Munger", "Muradnagar", "Murliganj",
  "Murshidabad", "Murtijapur", "Murwara", "Musabani", "Mussoorie", "Muvattupuzha", "Muzaffarnagar", "Muzaffarpur", "Mysore", "Nabadwip",
  "Nabarangapur", "Nabai", "Nabha", "Nadiad", "Nagapattinam", "Nagari", "Nagarkurnool", "Nagda", "Nagercoil", "Nagina",
  "Nagla", "Nagpur", "Nahan", "Naharlagun", "Naihati", "Naila Janjgir", "Nainital", "Nainpur", "Najibabad", "Nakodar",
  "Nakur", "Nalasopara", "Nalbari", "Namagiripettai", "Namakkal", "Nanded-Waghala", "Nandgaon", "Nandivaram-Guduvancheri", "Nandura", "Nandurbar",
  "Nangal", "Nanjangud", "Nanpara", "Narasapur", "Narasaraopet", "Naraura", "Narayanpet", "Nargund", "Narkatiaganj", "Narkhed",
  "Narsinghgarh", "Narsipatnam", "Nashik", "Nasirabad", "Natham", "Nathdwara", "Nautanwa", "Navalgund", "Navsari", "Nawabganj",
  "Nawada", "Nawanshahr", "Nawapur", "Nedumangad", "Neem-Ka-Thana", "Neemuch", "Nehtaur", "Nelamangala", "Nellore", "Nepanagar",
  "New Delhi", "Neyyattinkara", "Neyveli", "Nidadavole", "Nilanga", "Nimbahera", "Nipani", "Nirmal", "Niwari", "Niwai",
  "Nizamabad", "Nohar", "NOIDA", "Nokha", "Nokha", "Nongstoin", "Noorpur", "North Lakhimpur", "Nowgong", "Nowrozabad",
  "Nuzvid", "O Valley", "Obra", "Oddanchatram", "Ongole", "Orai", "Osmanabad", "Ottappalam", "Ozar", "P.N.Patti",
  "Pacode", "Pachore", "Pachora", "Padmanabhapuram", "Padra", "Padrauna", "Paithan", "Pakaur", "Palacole", "Palai",
  "Palakkad", "Palanpur", "Palasa Kasibugga", "Palghar", "Pali", "Pali", "Palia Kalan", "Palitana", "Palladam", "Pallapatti",
  "Pallikonda", "Palwancha", "Panagar", "Panagudi", "Panaji", "Panchkula", "Panchla", "Pandharkaoda", "Pandhurna", "Pandharpur",
  "Pandua", "Panipat", "Panna", "Panniyannur", "Panruti", "Panvel", "Pappinisseri", "Paradip", "Paramakudi", "Parangipettai",
  "Parasi", "Paravoor", "Pardi", "Parbhani", "Parli", "Parola", "Parlakhemundi", "Partur", "Parvathipuram", "Pasan",
  "Paschim Punropara", "Pasighat", "Patan", "Pathanamthitta", "Pathardi", "Pathankot", "Pathri", "Patiala", "Patna", "Patran",
  "Patratu", "Patti", "Pattukkottai", "Patur", "Pauni", "Pauri", "Pavagada", "Payyannur", "Pedana", "Peddapuram",
  "Pehowa", "Pen", "Perambalur", "Peravurani", "Peringathur", "Perinthalmanna", "Periyakulam", "Periyasemur", "Pernampattu", "Perumbavoor",
  "Petlad", "Phagwara", "Phalodi", "Phaltan", "Phillaur", "Phulabani", "Phulera", "Phulpur", "Phusro", "Pihani",
  "Pilani", "Pilibanga", "Pilibhit", "Pilkhuwa", "Pindwara", "Pinjore", "Pipar city", "Pipariya", "Piro", "Pithapuram",
  "Pithampur", "Pithoragarh", "Pollachi", "Polur", "Pondicherry", "Pondur", "Ponnani", "Ponneri", "Ponnur", "Porbandar",
  "Porsa", "Port Blair", "Powayan", "Prantij", "Pratapgarh", "Pratapgarh", "Prithvipur", "Proddatur", "Pudukkottai", "Pudupattinam",
  "Pukhrayan", "Pulgaon", "Puliyankudi", "Punalur", "Pune", "Punganur", "Punjaipugalur", "Puranpur", "Puri", "Purna",
  "Purnia", "Purquazi", "Purulia", "Purwa", "Pusad", "Puttur", "Puttur", "Qadian", "Quilandy", "Rabkavi Banhatti",
  "Radhanpur", "Rae Bareli", "Rafiganj", "Raghogarh-Vijaypur", "Raghunathpur", "Rahatgarh", "Rahuri", "Raichur", "Raiganj", "Raigarh",
  "Raikot", "Raipur", "Raisen", "Raisinghnagar", "Rajagangapur", "Rajahmundry", "Rajakhera", "Rajaldesar", "Rajam", "Rajampet",
  "Rajapalayam", "Rajauri", "Rajgarh", "Rajgarh (Alwar)", "Rajgarh (Churu)", "Rajgir", "Rajkot", "Rajnandgaon", "Rajpipla", "Rajpura",
  "Rajsamand", "Rajula", "Rajura", "Ramachandrapuram", "Ramachandrapuram", "Ramdurg", "Ramanagaram", "Ramanathapuram", "Ramganj Mandi", "Ramngarh",
  "Ramngarh", "Ramngarh", "Ramnagar", "Ramnagar", "Ramnagar", "Ramagundam", "Rameshwaram", "Rampura Phul", "Rampur", "Rampurhat",
  "Rampur Maniharan", "Ramtek", "Ranaghat", "Ranavav", "Ranchi", "Rangia", "Rania", "Ranibennur", "Rapar", "Rasipuram",
  "Rasra", "Ratangarh", "Rath", "Ratia", "Ratlam", "Ratnagiri", "Rau", "Raurkela", "Raver", "Rawatbhata",
  "Rawatsar", "Rayachoti", "Rayadurg", "Rayagada", "Reengus", "Rehli", "Renigunta", "Renukoot", "Reoti", "Repalle",
  "Revelganj", "Rewa", "Rewari", "Risod", "Rishikesh", "Robertson Pet", "Robertsganj", "Rohtak", "Ron", "Roorkee",
  "Rosera", "Rudauli", "Rudrapur", "Rudrapur", "Rupnagar", "Sabalgarh", "Sadabad", "Sadalgi", "Sadasivpet", "Sadri",
  "Sadulshahar", "Safidon", "Safipur", "Sagar", "Sagar", "Sagar", "Sagwara", "Saharsa", "Saharanpur", "Sahaspur",
  "Sahaswan", "Sahawar", "Sahibganj", "Sahjanwa", "Saidpur", "Sainthia", "Sakti", "Sakleshpur", "Salaya", "Salem",
  "Salur", "Samalkha", "Samalkot", "Samana", "Samastipur", "Sambalpur", "Sambhal", "Sambhar", "Samdhan", "Samthar",
  "Sanand", "Sanawad", "Sanchore", "Sandi", "Sandila", "Sandur", "Sangamner", "Sangareddy", "Sangaria", "Sangli",
  "Sangole", "Sangrur", "Sankarankoil", "Sankari", "Sankeshwar", "Santipur", "Sarangpur", "Sardhana", "Sardarshahar", "Sarni",
  "Sasaram", "Sasvad", "Satana", "Satara", "Satna", "Sattenapalle", "Sattur", "Saunda", "Saundatti-Yellamma", "Sausar",
  "Savanur", "Savarkundla", "Savner", "Sawai Madhopur", "Sawantwadi", "Sedam", "Sehore", "Sendhwa", "Seohara", "Seoni",
  "Seoni-Malwa", "Shahabad", "Shahabad", "Shahabad", "Shahade", "Shahbad", "Shahdol", "Shahganj", "Shahjahanpur", "Shahpur",
  "Shahpura", "Shahpura", "Shajapur", "Shamgarh", "Shamli", "Shamsabad", "Shamsabad", "Shegaon", "Sheikhpura", "Shendurjana",
  "Shenkottai", "Sheoganj", "Sheohar", "Sheopur", "Sherghati", "Sherkot", "Shiggaon", "Shikapur", "Shikarpur", "Shikohabad",
  "Shillong", "Shimla", "Shimoga", "Shirdi", "Shirpur-Warwade", "Shirur", "Shishgarh", "Sholavandan", "Sholingur", "Shoranur",
  "Shorapur", "Shrigonda", "Shrirampur", "Shrirangapattana", "Shujalpur", "Siana", "Siddipet", "Sidhpur", "Sidhi", "Sidlaghatta",
  "Sihor", "Sihora", "Sikanderpur", "Sikandra Rao", "Sikandrabad", "Sikar", "Silao", "Silapathar", "Silchar", "Siliguri",
  "Sillod", "Silvassa", "Simdega", "Sindgi", "Sindhnur", "Singapur", "Singrauli", "Sinnar", "Sira", "Sircilla",
  "Sirhind Fatehgarh Sahib", "Sirkali", "Sirohi", "Sironj", "Sirsa", "Sirsi", "Sirsi", "Siruguppa", "Sirsaganj", "Sitamarhi",
  "Sitapur", "Sitarganj", "Sivaganga", "Sivagiri", "Sivakasi", "Siwan", "Sohagpur", "Sohna", "Sojat", "Solan",
  "Solapur", "Sonamukhi", "Sonepur", "Songadh", "Sonipat", "Sopore", "Soro", "Soron", "Soyagaon", "Sri Madhopur",
  "Srikakulam", "Srikalahasti", "Srinagar", "Srinivaspur", "Srirampore", "Srivilliputhur", "Suar", "Sujanpur", "Sujangarh", "Sultanganj",
  "Sultanpur", "Sumerpur", "Sumerpur", "Sunabeda", "Sunam", "Sundargarh", "Sundarnagar", "Supaul", "Surandai", "Surat",
  "Suratgarh", "Suriyampalayam", "Suri", "Suryapet", "Tadepalligudem", "Tadpatri", "Taki", "Talaja", "Talcher", "Talegaon Dabhade",
  "Talikota", "Talode", "Taliparamba", "Talwara", "Tamluk", "Tanda", "Tanda", "Tandur", "Tanuku", "Tarakeswar",
  "Taranagar", "Tarana", "Taraori", "Tarikere", "Tarn Taran", "Tasgaon", "Tehri", "Tekkalakota", "Tenali", "Tenkasi",
  "Tenu Dam-cum- Kathhara", "Terdal", "Tetri Bazar", "Tezpur", "Thakurdwara", "Thammampatti", "Thana Bhawan", "Thanesar", "Thangadh", "Thanjavur",
  "Tharad", "Tharamangalam", "Tharangambadi", "Theni Allinagaram", "Thirumangalam", "Thirunindravur", "Thiruparappu", "Thirupuvanam", "Thiruthuraipoondi", "Thiruvalla",
  "Thiruvananthapuram", "Thiruvallur", "Thiruvarur", "Thodupuzha", "Thoothukudi", "Thoubal", "Thrissur", "Tikamgarh", "Tilda Newra", "Tilhar",
  "Tindivanam", "Tinsukia", "Tiptur", "Tirora", "Tiruchendur", "Tiruchengode", "Tiruchirappalli", "Tirukalukundram", "Tirukkoyilur", "Tirunelveli",
  "Tirupathur", "Tirupathur", "Tirupati", "Tiruppur", "Tiruttani", "Tiruvannamalai", "Tiruvethipuram", "Tirur", "Tirwaganj", "Tittakudi",
  "Todabhim", "Todaraisingh", "Tohana", "Tonk", "Tuensang", "Tuljapur", "Tulsipur", "Tumkur", "Tumsar", "Tundla",
  "Tuni", "Tura", "Uchgaon", "Udaipur", "Udaipur", "Udaipurwati", "Udgir", "Udhagamandalam", "Udhampur", "Udumalaipettai",
  "Udupi", "Ujhani", "Ujjain", "Umarga", "Umarkhed", "Umbergaon", "Umred", "Umreth", "Una", "Unnamalaikadai",
  "Unnao", "Unjha", "Upleta", "Uravakonda", "Uran", "Uran Islampur", "Usilampatti", "Uthamapalayam", "Uthiramerur", "Utraula",
  "Vadakkuvalliyur", "Vadalur", "Vadgaon Kasba", "Vadgaon Road", "Vadipatti", "Vadnagar", "Vadodara", "Vaijapur", "Vaikom", "Valparai",
  "Valsad", "Vandavasi", "Vaniyambadi", "Vapi", "Vapi", "Varanasi", "Varkala", "Vasai", "Vedaranyam", "Vellakoil",
  "Vellore", "Venkatagiri", "Veraval", "Vicarabad", "Vidisha", "Vijainagar", "Vijapur", "Vijayapura", "Vijayawada", "Vikramasingapuram",
  "Viluppuram", "Vinukonda", "Viramgam", "Virar", "Virudhachalam", "Virudhunagar", "Visakhapatnam", "Visnagar", "Viswanatham", "Vita",
  "Vizianagaram", "Vrindavan", "Vyara", "Wadhwan", "Wadi", "Wai", "Wanaparthy", "Wani", "Wankaner", "Warangal",
  "Wara Seoni", "Wardha", "Warhapur", "Warora", "Warud", "Washim", "Warisaliganj", "Wokha", "Yadgir", "Yanam",
  "Yavatmal", "Yawal", "Yellandu", "Yemmiganur", "Yerraguntla", "Yevla", "Zahirabad", "Zaidpur", "Zamania", "Zira",
  "Zirakpur", "Zunheboto"
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CityCombobox = ({ value, onChange, placeholder = "Search city..." }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? INDIAN_CITIES.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : INDIAN_CITIES;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (city: string) => {
    onChange(city);
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative mt-1.5">
      <div
        className={cn(
          "flex items-center h-12 w-full rounded-md border bg-secondary/50 border-border/50 px-3 cursor-text",
          open && "border-primary ring-1 ring-primary/20"
        )}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        <input
          ref={inputRef}
          type="text"
          value={open ? search : value}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={value || placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No city found</div>
          ) : (
            <ul className="py-1">
              {filtered.map((city) => (
                <li
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                    value === city && "bg-accent/50 font-medium"
                  )}
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === city ? "opacity-100 text-primary" : "opacity-0")} />
                  {city}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CityCombobox;
