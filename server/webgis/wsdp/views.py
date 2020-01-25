import os
import time
import json
import logging
from datetime import datetime

from django.conf import settings
from django.http import Http404, HttpResponse
from django.core.exceptions import PermissionDenied

import zeep
from zeep.wsse.username import UsernameToken


logger = logging.getLogger('django.wsdl')
wsdl_url = 'https://katastr.cuzk.cz:443/ws/wsdp/2.8/sestavy?wsdl'


# client = zeep.Client("https://katastr.cuzk.cz:443/ws/wsdp/2.8/ciselnik?wsdl", wsse=UsernameToken(login, password))
# print(client.service.seznamUcelu())


def lv(request, typ, vypis, lv_id):
    project = request.GET.get("project")
    if not project:
        raise Http404

    username, project_dir = project.split(os.path.sep)[:2]
    if not request.user.is_authenticated or (not request.user.is_superuser and request.user.username != username):
        raise PermissionDenied

    project_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, username, project_dir)
    try:
        with open(os.path.join(project_dir, '.wsdp.json')) as f:
            credentials = json.load(f)
            login = credentials["login"]
            password = credentials["password"]
    except FileNotFoundError:
        raise PermissionDenied

    client = zeep.Client(wsdl_url, wsse=UsernameToken(login, password))
    resp = client.service.generujLVPresObjekty(
        seznamuObjektuTyp=typ,
        seznamObjektu=[lv_id],
        castecnyVypis=vypis,
        cisloJednaci=datetime.strftime(datetime.now(), "MT-%Y%m%d-%H-%M-1"),
        ucelKod=1,
        format="pdf"
    )
    try:
        id_sestavy = resp["reportList"]["report"][0]["id"]
    except zeep.exceptions.Fault:
        raise PermissionDenied
    except (KeyError, TypeError):
        logger.error("Failed to fetch report: %s" % lv_id)
        logger.info(resp)
        raise Http404

    respdf = client.service.seznamSestav(idSestavy=id_sestavy)
    while respdf["reportList"]["report"][0]["stav"] != "zpracován":
        time.sleep(5)
        respdf = client.service.seznamSestav(idSestavy=id_sestavy)

    respdf = client.service.vratSestavu(idSestavy=id_sestavy)
    return HttpResponse(respdf["reportList"]["report"][0]["souborSestavy"], content_type="application/pdf")
