--
-- PostgreSQL database dump
--

\restrict 2QGNkuQtCOwsqgfnRDsAymxOTIvcLIWD7oTMBjSEdb9KJCaAu5HoYbEi37Upoth

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: appointmentstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointmentstatus AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);


--
-- Name: membershipstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membershipstatus AS ENUM (
    'pending',
    'active',
    'expired',
    'cancelled'
);


--
-- Name: paymentmethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.paymentmethod AS ENUM (
    'cash',
    'card',
    'transfer',
    'membership'
);


--
-- Name: check_slot_availability(date, time without time zone, time without time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_slot_availability(p_date date, p_start_time time without time zone, p_end_time time without time zone, p_exclude_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_conflicts INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments
    WHERE appointment_date = p_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (start_time < p_end_time AND end_time > p_start_time);
    
    RETURN v_conflicts = 0;
END;
$$;


--
-- Name: generate_checkout_code(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_checkout_code(p_date date) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_code VARCHAR(6);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(
            SELECT 1 FROM appointments 
            WHERE checkout_code = v_code 
            AND appointment_date = p_date
        ) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_code;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(20) DEFAULT 'admin'::character varying,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    uuid character varying(36),
    client_id integer NOT NULL,
    service_id integer NOT NULL,
    appointment_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    status public.appointmentstatus DEFAULT 'scheduled'::public.appointmentstatus,
    checkout_code character varying(6),
    notes text,
    reminder_sent boolean,
    confirmation_sent boolean,
    created_by character varying(50),
    cancelled_at timestamp without time zone,
    cancelled_reason character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: blocked_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_dates (
    id integer NOT NULL,
    blocked_date date NOT NULL,
    reason character varying(255),
    created_at timestamp without time zone
);


--
-- Name: blocked_dates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.blocked_dates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: blocked_dates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.blocked_dates_id_seq OWNED BY public.blocked_dates.id;


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id integer NOT NULL,
    day_of_week integer NOT NULL,
    day_name character varying(20) NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    is_open boolean,
    break_start time without time zone,
    break_end time without time zone,
    created_at timestamp without time zone
);


--
-- Name: business_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.business_hours_id_seq OWNED BY public.business_hours.id;


--
-- Name: checkout_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_products (
    id integer NOT NULL,
    checkout_id integer NOT NULL,
    product_id integer NOT NULL,
    product_name character varying(100) NOT NULL,
    quantity integer,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: checkout_products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkout_products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkout_products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkout_products_id_seq OWNED BY public.checkout_products.id;


--
-- Name: checkouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkouts (
    id integer NOT NULL,
    uuid character varying(36),
    appointment_id integer NOT NULL,
    client_name character varying(100) NOT NULL,
    client_email character varying(100),
    client_phone character varying(20) NOT NULL,
    service_cost numeric(10,2) NOT NULL,
    products_cost numeric(10,2),
    discount numeric(10,2),
    subtotal numeric(10,2) NOT NULL,
    tax numeric(10,2),
    total numeric(10,2) NOT NULL,
    payment_method public.paymentmethod NOT NULL,
    used_membership boolean,
    membership_id integer,
    notes text,
    completed_at timestamp without time zone
);


--
-- Name: checkouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checkouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checkouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checkouts_id_seq OWNED BY public.checkouts.id;


--
-- Name: client_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_memberships (
    id integer NOT NULL,
    uuid character varying(36),
    client_id integer NOT NULL,
    membership_type_id integer NOT NULL,
    total_services integer NOT NULL,
    used_services integer,
    purchase_date date NOT NULL,
    activation_date date,
    expiration_date date NOT NULL,
    status public.membershipstatus,
    payment_method character varying(50),
    payment_amount numeric(10,2),
    payment_reference character varying(100),
    notes text,
    activated_by character varying(100),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: client_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_memberships_id_seq OWNED BY public.client_memberships.id;


--
-- Name: client_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(50) NOT NULL,
    color character varying(20) NOT NULL,
    description character varying(255),
    priority integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: client_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_types_id_seq OWNED BY public.client_types.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    uuid character varying(36),
    name character varying(100) NOT NULL,
    email character varying(100),
    phone character varying(20) NOT NULL,
    client_type_id integer DEFAULT 1,
    notes text,
    total_visits integer DEFAULT 0,
    total_spent numeric(12,2) DEFAULT 0,
    last_visit_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: membership_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    client_type_id integer NOT NULL,
    total_services integer NOT NULL,
    validity_days integer NOT NULL,
    price numeric(10,2) NOT NULL,
    benefits json,
    is_active boolean,
    display_order integer,
    created_at timestamp without time zone
);


--
-- Name: membership_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.membership_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: membership_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.membership_types_id_seq OWNED BY public.membership_types.id;


--
-- Name: membership_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_usage (
    id integer NOT NULL,
    membership_id integer NOT NULL,
    appointment_id integer NOT NULL,
    service_id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    used_at timestamp without time zone,
    notes text
);


--
-- Name: membership_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.membership_usage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: membership_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.membership_usage_id_seq OWNED BY public.membership_usage.id;


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id integer NOT NULL,
    client_id integer,
    appointment_id integer,
    membership_id integer,
    channel character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    recipient character varying(100) NOT NULL,
    message_content text,
    status character varying(50),
    external_id character varying(100),
    error_message text,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone
);


--
-- Name: notification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_logs_id_seq OWNED BY public.notification_logs.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    stock integer,
    sku character varying(50),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255),
    display_order integer,
    is_active boolean,
    created_at timestamp without time zone
);


--
-- Name: service_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_categories_id_seq OWNED BY public.service_categories.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    category_id integer,
    name character varying(100) NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean,
    requires_confirmation boolean,
    max_per_day integer,
    display_order integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    image_url character varying(255)
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    description character varying(255),
    updated_at timestamp without time zone
);


--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    uuid character varying(36),
    checkout_id integer,
    membership_purchase_id integer,
    client_id integer NOT NULL,
    type character varying(50) NOT NULL,
    description character varying(255),
    amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    transaction_date date NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: v_active_memberships; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_memberships AS
 SELECT cm.id,
    cm.uuid,
    cm.client_id,
    cm.membership_type_id,
    cm.total_services,
    cm.used_services,
    cm.purchase_date,
    cm.activation_date,
    cm.expiration_date,
    cm.status,
    cm.payment_method,
    cm.payment_amount,
    cm.payment_reference,
    cm.notes,
    cm.activated_by,
    cm.created_at,
    cm.updated_at,
    c.name AS client_name,
    c.phone AS client_phone,
    mt.name AS membership_name,
    (cm.total_services - cm.used_services) AS remaining_services
   FROM ((public.client_memberships cm
     JOIN public.clients c ON ((cm.client_id = c.id)))
     JOIN public.membership_types mt ON ((cm.membership_type_id = mt.id)))
  WHERE ((cm.status = 'active'::public.membershipstatus) AND (cm.expiration_date >= CURRENT_DATE));


--
-- Name: v_today_appointments; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_today_appointments AS
 SELECT a.id,
    a.uuid,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.checkout_code,
    c.name AS client_name,
    c.phone AS client_phone,
    ct.name AS client_type,
    ct.color AS client_color,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes
   FROM (((public.appointments a
     JOIN public.clients c ON ((a.client_id = c.id)))
     JOIN public.client_types ct ON ((c.client_type_id = ct.id)))
     JOIN public.services s ON ((a.service_id = s.id)))
  WHERE (a.appointment_date = CURRENT_DATE)
  ORDER BY a.start_time;


--
-- Name: wallet_passes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_passes (
    id integer NOT NULL,
    uuid character varying(36),
    client_id integer NOT NULL,
    membership_id integer,
    pass_type character varying(20) NOT NULL,
    pass_identifier character varying(100) NOT NULL,
    serial_number character varying(100),
    authentication_token character varying(255),
    push_token character varying(255),
    is_installed boolean,
    installed_at timestamp without time zone,
    last_updated_at timestamp without time zone,
    is_active boolean,
    created_at timestamp without time zone
);


--
-- Name: wallet_passes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_passes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_passes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_passes_id_seq OWNED BY public.wallet_passes.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: blocked_dates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates ALTER COLUMN id SET DEFAULT nextval('public.blocked_dates_id_seq'::regclass);


--
-- Name: business_hours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours ALTER COLUMN id SET DEFAULT nextval('public.business_hours_id_seq'::regclass);


--
-- Name: checkout_products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_products ALTER COLUMN id SET DEFAULT nextval('public.checkout_products_id_seq'::regclass);


--
-- Name: checkouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts ALTER COLUMN id SET DEFAULT nextval('public.checkouts_id_seq'::regclass);


--
-- Name: client_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_memberships ALTER COLUMN id SET DEFAULT nextval('public.client_memberships_id_seq'::regclass);


--
-- Name: client_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_types ALTER COLUMN id SET DEFAULT nextval('public.client_types_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: membership_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_types ALTER COLUMN id SET DEFAULT nextval('public.membership_types_id_seq'::regclass);


--
-- Name: membership_usage id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_usage ALTER COLUMN id SET DEFAULT nextval('public.membership_usage_id_seq'::regclass);


--
-- Name: notification_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs ALTER COLUMN id SET DEFAULT nextval('public.notification_logs_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: service_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories ALTER COLUMN id SET DEFAULT nextval('public.service_categories_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: wallet_passes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_passes ALTER COLUMN id SET DEFAULT nextval('public.wallet_passes_id_seq'::regclass);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, username, password_hash, name, role, is_active, last_login, created_at) FROM stdin;
1	admin	$2b$10$vKSRgO7AMQVZdcqNPLFtzuLHxPxyz6QZKHEmHzYHiXDZq/kwR9tpy	Miguel Trujillo	admin	t	2025-12-05 22:29:44.874944	2025-12-05 09:57:58.39933
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, uuid, client_id, service_id, appointment_date, start_time, end_time, status, checkout_code, notes, reminder_sent, confirmation_sent, created_by, cancelled_at, cancelled_reason, created_at, updated_at) FROM stdin;
1	fda7dad6-c2c9-4ab5-aa7d-8f960e6d1ea1	1	1	2025-12-04	11:00:00	12:00:00	confirmed	ABC123	\N	f	f	admin	\N	\N	2025-12-04 15:33:15.155054	2025-12-04 15:33:15.155055
2	\N	4	4	2025-12-06	10:00:00	13:00:00	scheduled	0370	\N	\N	\N	client	\N	\N	\N	2025-12-05 17:32:42.211312
\.


--
-- Data for Name: blocked_dates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blocked_dates (id, blocked_date, reason, created_at) FROM stdin;
\.


--
-- Data for Name: business_hours; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_hours (id, day_of_week, day_name, open_time, close_time, is_open, break_start, break_end, created_at) FROM stdin;
1	0	Domingo	\N	\N	f	\N	\N	2025-12-04 15:33:15.15645
3	2	Martes	10:00:00	20:00:00	t	14:00:00	15:00:00	2025-12-04 15:33:15.156451
4	3	Miércoles	10:00:00	20:00:00	t	14:00:00	15:00:00	2025-12-04 15:33:15.156451
5	4	Jueves	10:00:00	20:00:00	t	14:00:00	15:00:00	2025-12-04 15:33:15.156452
6	5	Viernes	10:00:00	20:00:00	t	14:00:00	15:00:00	2025-12-04 15:33:15.156452
7	6	Sábado	10:00:00	17:00:00	t	\N	\N	2025-12-04 15:33:15.156452
2	1	Lunes	10:00:00	20:00:00	t	15:00:00	15:00:00	2025-12-04 15:33:15.156451
\.


--
-- Data for Name: checkout_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checkout_products (id, checkout_id, product_id, product_name, quantity, unit_price, subtotal) FROM stdin;
\.


--
-- Data for Name: checkouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.checkouts (id, uuid, appointment_id, client_name, client_email, client_phone, service_cost, products_cost, discount, subtotal, tax, total, payment_method, used_membership, membership_id, notes, completed_at) FROM stdin;
\.


--
-- Data for Name: client_memberships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_memberships (id, uuid, client_id, membership_type_id, total_services, used_services, purchase_date, activation_date, expiration_date, status, payment_method, payment_amount, payment_reference, notes, activated_by, created_at, updated_at) FROM stdin;
1	af5ba3e2-9527-492a-991a-51c04fbf816f	2	1	6	2	2025-11-04	2025-11-04	2026-05-03	active	card	1500.00	\N	\N	admin	2025-12-04 15:33:15.152999	2025-12-04 15:33:15.152999
\.


--
-- Data for Name: client_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_types (id, name, display_name, color, description, priority, created_at, updated_at) FROM stdin;
1	normal	Cliente	#C4A35A	Cliente regular	0	2025-12-04 15:33:15.132314	2025-12-04 15:33:15.13232
2	premium	Premium	#D4B76A	Cliente con membresía Premium	1	2025-12-04 15:33:15.13232	2025-12-04 15:33:15.132321
3	vip	VIP	#1A1A1A	Cliente VIP con beneficios exclusivos	2	2025-12-04 15:33:15.132321	2025-12-04 15:33:15.132321
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, uuid, name, email, phone, client_type_id, notes, total_visits, total_spent, last_visit_date, is_active, created_at, updated_at) FROM stdin;
1	ea0059ab-b30b-42b3-a163-de5cb174caf8	Juan Pérez	juan@email.com	5551234567	1	Cliente frecuente	0	0.00	\N	t	2025-12-04 15:33:15.150267	2025-12-04 15:33:15.150267
2	f31555a6-ee7c-43db-8189-803faa57792a	Miguel González	miguel@email.com	5559876543	2	Membresía Premium activa	0	0.00	\N	t	2025-12-04 15:33:15.150275	2025-12-04 15:33:15.150275
3	50fe15b0-31ab-45ec-b8dd-09d7d4ea89e4	Carlos Rodríguez	carlos@email.com	5554567890	3	Cliente VIP	0	0.00	\N	t	2025-12-04 15:33:15.150281	2025-12-04 15:33:15.150281
4	\N	said	\N	4272757136	1	\N	0	0.00	\N	t	2025-12-05 17:22:17.660818	2025-12-05 17:22:17.660818
\.


--
-- Data for Name: membership_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.membership_types (id, name, description, client_type_id, total_services, validity_days, price, benefits, is_active, display_order, created_at) FROM stdin;
1	Premium 6 Cortes	Membresía Premium con 6 cortes de cabello	2	6	180	1500.00	{"discount_products": 10, "priority_booking": true, "free_drinks": true}	t	1	2025-12-04 15:33:15.147448
2	Premium 10 Cortes	Membresía Premium con 10 cortes de cabello	2	10	365	2400.00	{"discount_products": 15, "priority_booking": true, "free_drinks": true}	t	2	2025-12-04 15:33:15.147449
3	VIP Anual	Membresía VIP con 12 servicios y beneficios exclusivos	3	12	365	4500.00	{"discount_products": 20, "priority_booking": true, "free_drinks": true, "exclusive_services": true}	t	3	2025-12-04 15:33:15.147449
\.


--
-- Data for Name: membership_usage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.membership_usage (id, membership_id, appointment_id, service_id, service_name, used_at, notes) FROM stdin;
\.


--
-- Data for Name: notification_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_logs (id, client_id, appointment_id, membership_id, channel, type, recipient, message_content, status, external_id, error_message, sent_at, delivered_at, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, description, price, stock, sku, is_active, created_at, updated_at) FROM stdin;
1	Shampoo Braco's	Shampoo 100% natural, libre de sulfatos, parabenos y sales. Enriquecido con Minoxidil al 2%	350.00	50	SHAMP-BRACOS	t	2025-12-04 15:33:15.145625	2025-12-04 15:33:15.145627
2	Aceite para Barba Braco's	Aceite hidratante para barba con esencias naturales	250.00	40	ACEITE-BARBA	t	2025-12-04 15:33:15.145627	2025-12-04 15:33:15.145628
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_categories (id, name, description, display_order, is_active, created_at) FROM stdin;
1	Cortes	Cortes de cabello para caballero y niño	1	t	2025-12-04 15:33:15.139112
2	Barba	Rituales y arreglos de barba	2	t	2025-12-04 15:33:15.139114
3	Tratamientos Capilares	Prótesis y terapias capilares	3	t	2025-12-04 15:33:15.139115
4	Cuidado Facial	Mascarillas y tratamientos faciales	4	t	2025-12-04 15:33:15.139115
5	Cuidado Personal	Manicura y pedicura	5	t	2025-12-04 15:33:15.139116
6	Paquetes	Combinaciones y paquetes especiales	6	t	2025-12-04 15:33:15.139116
7	Cortes	\N	1	\N	\N
8	Barba	\N	2	\N	\N
9	Tratamientos Capilares	\N	3	\N	\N
10	Cuidado Facial	\N	4	\N	\N
11	Cuidado Personal	\N	5	\N	\N
12	Paquetes	\N	6	\N	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, category_id, name, description, duration_minutes, price, is_active, requires_confirmation, max_per_day, display_order, created_at, updated_at, image_url) FROM stdin;
7	4	MASCARILLA PLASTIFICADA NEGRA	Recomendada para obtener un rostro limpio de puntos negros y espinillas.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial	60	300.00	t	f	\N	1	2025-12-04 15:33:15.143878	2025-12-04 15:33:15.143878	assets/mascarilla_negra.jpeg
8	4	MASCARILLA DE ARCILLA	Después de la aplicación de la mascarilla plástica recomendamos como mantenimiento la mascarilla de arcilla que exfolia el rostro de una manera más amigable y sutil pero sin perder efectividad en el proceso.\n\nDuración 60 minutos\n• Limpieza de rostro\n• Aplicación y retiro de mascarilla\n• Aplicación de productos Premium\n• Masaje facial	60	300.00	t	f	\N	2	2025-12-04 15:33:15.143879	2025-12-04 15:33:15.143879	assets/arcilla.jpeg
9	5	MANICURA CABALLERO	Duración aproximada 60 minutos\n• Retiro de cutícula\n• Exfoliación de manos\n• Recorte de uñas\n• Arreglo de uñas\n• Humectación de manos\n• Masaje de manos y dedos	60	300.00	t	f	\N	1	2025-12-04 15:33:15.143879	2025-12-04 15:33:15.143879	assets/manicura_caballero.jpeg
10	5	PEDICURA CABALLERO	Duración aproximada 60 minutos\n• Retiro de cutícula\n• Exfoliación de pies\n• Recorte y limado de uñas\n• Limado de callosidad\n• Humectación de pies\n• Masaje de pies	60	300.00	t	f	\N	2	2025-12-04 15:33:15.14388	2025-12-04 15:33:15.14388	assets/pedicura.jpeg
12	6	PAQUETE NUPCIAL D'Lux	Eleva tu imagen con un ritual completo de elegancia masculina. Ese es el mejor día de tu vida…Y la mejor versión de ti.\n\nDuración 240 minutos (4 horas)\n• Visagismo\n• Corte de cabello\n• Ritual de barba o rasurado clásico\n• Mascarilla de carbón activado o mascarilla de arcilla natural\n• Manicura SPA	240	1200.00	t	t	\N	2	2025-12-04 15:33:15.144663	2025-12-04 15:33:15.144664	assets/pqte_dlux.jpeg
3	2	Ritual Tradicional de Barba	Duración 60 minutos\n• Visagismo\n• Rasurado completo o arreglo de barba y bigote\n• Toallas calientes\n• Toallas frías\n• Masaje facial y craneal\n• Aromaterapia\n• Productos Premium	60	300.00	t	f	\N	1	2025-12-04 15:33:15.140891	2025-12-04 15:33:15.140892	assets/ritual_barba.jpeg
11	6	DÚO	Duración 120min (2 horas)\n• Visagismo\n• Corte de cabello\n• Ritual tradicional para rasurado o arreglo de barba y bigote	120	550.00	t	f	\N	1	2025-12-04 15:33:15.14388	2025-12-04 15:33:15.143881	assets/duo.png
1	1	Corte de cabello para CABALLERO	Duración aproximada 60 minutos\n• Lavado de cabello\n• Visagismo\n• Corte de cabello\n• Estilizado de peinado\n• Productos Premium	60	300.00	t	f	\N	1	2025-12-04 15:33:15.140889	2025-12-04 15:33:15.14089	assets/corte_caballero.jpeg
2	1	Corte de cabello NIÑO (hasta 11 años)	Duración aproximada 60 minutos\n• Lavado de cabello\n• Visagismo\n• Corte de cabello\n• Estilizado de peinado\n• Productos Premium	60	220.00	t	f	\N	2	2025-12-04 15:33:15.140891	2025-12-04 15:33:15.140891	assets/corte_nino.jpeg
4	3	INSTALACIÓN DE PRÓTESIS CAPILAR	Las prótesis o reemplazo capilar es una solución innovadora y efectiva para aquellos que experimentan pérdida de cabello o calvicie severa.\n\nTiempo aproximado 180 minutos (3 horas)\n• Diagnóstico\n• Prótesis capilar\n• Visagismo\n• Personalización	180	4800.00	t	t	\N	1	2025-12-04 15:33:15.143506	2025-12-04 15:33:15.143507	assets/instalacio_protesis.jpeg
5	3	MANTENIMIENTO DE PRÓTESIS CAPILAR	Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación.\n\nTiempo aproximado 120 minutos (2 horas)\n• Retiro seguro\n• Limpieza profesional\n• Ajuste de adhesivos\n• Colocación segura	120	650.00	t	f	\N	2	2025-12-04 15:33:15.143877	2025-12-04 15:33:15.143877	assets/mant_protesis.jpeg
6	3	TERAPIA INTEGRAL CAPILAR (TIC)	Recomendado para las personas que inician con un problema de calvicie de leve a moderada.\n\nEl TIC es una terapia que se enfoca en el cuidado y limpieza del cuero cabelludo con el objetivo de lograr un cuero cabelludo sano y por lo tanto un cabello grueso y en ocasiones abundante.\n\nDuración 60 minutos\n• Exfoliación capilar\n• Alta Frecuencia\n• Fotobiomodulación\n• Ozonoterapia\n• Aplicación de productos Premium	60	550.00	t	f	\N	3	2025-12-04 15:33:15.143878	2025-12-04 15:33:15.143878	assets/TIC.jpeg
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (id, key, value, description, updated_at) FROM stdin;
1	business_name	Braco's Barbería & Peluquería	Nombre del negocio	2025-12-04 15:33:15.158198
2	business_phone	5573432027	Teléfono principal del negocio	2025-12-04 15:33:15.158198
3	business_address	Calle Heroico Colegio Militar #46, Col. Centro, Tequisquiapan, Querétaro, México	Dirección física del negocio	2025-12-04 15:33:15.158199
5	timezone	America/Mexico_City	Zona horaria del negocio	2025-12-04 15:33:15.158199
6	primary_color	#C4A35A	Color dorado principal de Braco's	2025-12-04 15:33:15.1582
7	secondary_color	#3D3D3D	Color carbón secundario	2025-12-04 15:33:15.1582
8	whatsapp_enabled	false	Notificaciones por WhatsApp habilitadas	2025-12-04 15:33:15.1582
9	whatsapp_number	5573432027	Número de WhatsApp para notificaciones	2025-12-04 15:33:15.1582
10	currency	MXN	Moneda para precios	2025-12-04 15:33:15.158201
11	currency_symbol	$	Símbolo de moneda	2025-12-04 15:33:15.158201
12	booking_advance_days	30	Días máximos de anticipación para reservar	2025-12-04 15:33:15.158201
13	cancellation_hours	24	Horas mínimas de anticipación para cancelar	2025-12-04 15:33:15.158201
15	complimentary_drinks	Agua, té, refrescos, refrescos sin azúcar, café mezcla Premium de Chiapas (expresso, cappuccino, latte, americano). Para mayores de 18 años: whisky, tequila, cerveza, carajillo	Bebidas de cortesía incluidas en todos los servicios	\N
16	last_appointment_weekday	19:00	Hora de última cita en días de semana (lunes a viernes)	\N
17	last_appointment_saturday	16:00	Hora de última cita los sábados	\N
4	slot_interval_minutes	60	Intervalo de slots para citas en minutos	2025-12-04 15:33:15.158199
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transactions (id, uuid, checkout_id, membership_purchase_id, client_id, type, description, amount, payment_method, transaction_date, created_at) FROM stdin;
\.


--
-- Data for Name: wallet_passes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wallet_passes (id, uuid, client_id, membership_id, pass_type, pass_identifier, serial_number, authentication_token, push_token, is_installed, installed_at, last_updated_at, is_active, created_at) FROM stdin;
\.


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 1, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.appointments_id_seq', 2, true);


--
-- Name: blocked_dates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.blocked_dates_id_seq', 1, false);


--
-- Name: business_hours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.business_hours_id_seq', 8, true);


--
-- Name: checkout_products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checkout_products_id_seq', 1, false);


--
-- Name: checkouts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checkouts_id_seq', 1, false);


--
-- Name: client_memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_memberships_id_seq', 1, true);


--
-- Name: client_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_types_id_seq', 4, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 4, true);


--
-- Name: membership_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.membership_types_id_seq', 3, true);


--
-- Name: membership_usage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.membership_usage_id_seq', 1, false);


--
-- Name: notification_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_logs_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 6, true);


--
-- Name: service_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.service_categories_id_seq', 1, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.services_id_seq', 6, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 17, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: wallet_passes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.wallet_passes_id_seq', 1, false);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: appointments appointments_checkout_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_checkout_code_key UNIQUE (checkout_code);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_uuid_key UNIQUE (uuid);


--
-- Name: blocked_dates blocked_dates_blocked_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_blocked_date_key UNIQUE (blocked_date);


--
-- Name: blocked_dates blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_dates
    ADD CONSTRAINT blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_day_of_week_key UNIQUE (day_of_week);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: checkout_products checkout_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_products
    ADD CONSTRAINT checkout_products_pkey PRIMARY KEY (id);


--
-- Name: checkouts checkouts_appointment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts
    ADD CONSTRAINT checkouts_appointment_id_key UNIQUE (appointment_id);


--
-- Name: checkouts checkouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts
    ADD CONSTRAINT checkouts_pkey PRIMARY KEY (id);


--
-- Name: checkouts checkouts_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts
    ADD CONSTRAINT checkouts_uuid_key UNIQUE (uuid);


--
-- Name: client_memberships client_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_memberships
    ADD CONSTRAINT client_memberships_pkey PRIMARY KEY (id);


--
-- Name: client_memberships client_memberships_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_memberships
    ADD CONSTRAINT client_memberships_uuid_key UNIQUE (uuid);


--
-- Name: client_types client_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_types
    ADD CONSTRAINT client_types_name_key UNIQUE (name);


--
-- Name: client_types client_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_types
    ADD CONSTRAINT client_types_pkey PRIMARY KEY (id);


--
-- Name: clients clients_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_phone_key UNIQUE (phone);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: clients clients_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_uuid_key UNIQUE (uuid);


--
-- Name: membership_types membership_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_types
    ADD CONSTRAINT membership_types_pkey PRIMARY KEY (id);


--
-- Name: membership_usage membership_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_usage
    ADD CONSTRAINT membership_usage_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_uuid_key UNIQUE (uuid);


--
-- Name: wallet_passes wallet_passes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_pkey PRIMARY KEY (id);


--
-- Name: wallet_passes wallet_passes_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_uuid_key UNIQUE (uuid);


--
-- Name: idx_appointments_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_client ON public.appointments USING btree (client_id);


--
-- Name: idx_appointments_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_code ON public.appointments USING btree (checkout_code);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (appointment_date);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_clients_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_phone ON public.clients USING btree (phone);


--
-- Name: idx_clients_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_uuid ON public.clients USING btree (uuid);


--
-- Name: idx_memberships_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memberships_client ON public.client_memberships USING btree (client_id);


--
-- Name: idx_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_memberships_status ON public.client_memberships USING btree (status);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (transaction_date);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: appointments tr_appointments_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: clients tr_clients_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: client_memberships tr_memberships_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_memberships_updated BEFORE UPDATE ON public.client_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: checkout_products checkout_products_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_products
    ADD CONSTRAINT checkout_products_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES public.checkouts(id);


--
-- Name: checkout_products checkout_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_products
    ADD CONSTRAINT checkout_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: checkouts checkouts_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts
    ADD CONSTRAINT checkouts_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: checkouts checkouts_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkouts
    ADD CONSTRAINT checkouts_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.client_memberships(id);


--
-- Name: client_memberships client_memberships_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_memberships
    ADD CONSTRAINT client_memberships_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_memberships client_memberships_membership_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_memberships
    ADD CONSTRAINT client_memberships_membership_type_id_fkey FOREIGN KEY (membership_type_id) REFERENCES public.membership_types(id);


--
-- Name: clients clients_client_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_client_type_id_fkey FOREIGN KEY (client_type_id) REFERENCES public.client_types(id);


--
-- Name: membership_types membership_types_client_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_types
    ADD CONSTRAINT membership_types_client_type_id_fkey FOREIGN KEY (client_type_id) REFERENCES public.client_types(id);


--
-- Name: membership_usage membership_usage_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_usage
    ADD CONSTRAINT membership_usage_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: membership_usage membership_usage_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_usage
    ADD CONSTRAINT membership_usage_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.client_memberships(id);


--
-- Name: membership_usage membership_usage_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_usage
    ADD CONSTRAINT membership_usage_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: notification_logs notification_logs_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: notification_logs notification_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: notification_logs notification_logs_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.client_memberships(id);


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id);


--
-- Name: transactions transactions_checkout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_checkout_id_fkey FOREIGN KEY (checkout_id) REFERENCES public.checkouts(id);


--
-- Name: transactions transactions_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: transactions transactions_membership_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_membership_purchase_id_fkey FOREIGN KEY (membership_purchase_id) REFERENCES public.client_memberships(id);


--
-- Name: wallet_passes wallet_passes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: wallet_passes wallet_passes_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_passes
    ADD CONSTRAINT wallet_passes_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.client_memberships(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 2QGNkuQtCOwsqgfnRDsAymxOTIvcLIWD7oTMBjSEdb9KJCaAu5HoYbEi37Upoth

